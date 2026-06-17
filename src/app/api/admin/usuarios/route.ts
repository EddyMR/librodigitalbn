import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()

  const [
    { data: usuarios },
    { data: colegios },
    { data: grupoAlumnosData },
  ] = await Promise.all([
    admin.from('perfiles').select('*').in('rol', ['admin_colegio', 'catequista', 'alumno']).order('nombre'),
    admin.from('colegios').select('id, nombre, codigo').order('nombre'),
    admin.from('grupo_alumnos').select('alumno_id, grupo_id').eq('activo', true),
  ])

  const colegiosMap = new Map((colegios ?? []).map((c: any) => [c.id, { nombre: c.nombre, codigo: c.codigo }]))

  const grupoIds = [...new Set((grupoAlumnosData ?? []).map((ga: any) => ga.grupo_id))]
  const { data: gruposData } = grupoIds.length > 0
    ? await admin.from('grupos').select('id, nombre').in('id', grupoIds)
    : { data: [] as any[] }
  const grupoNombreMap = new Map((gruposData ?? []).map((g: any) => [g.id, g.nombre]))

  const gruposByAlumno: Record<string, any[]> = {}
  for (const ga of (grupoAlumnosData ?? []) as any[]) {
    if (!gruposByAlumno[ga.alumno_id]) gruposByAlumno[ga.alumno_id] = []
    gruposByAlumno[ga.alumno_id].push({
      grupo_id: ga.grupo_id,
      grupo: grupoNombreMap.has(ga.grupo_id)
        ? { id: ga.grupo_id, nombre: grupoNombreMap.get(ga.grupo_id) }
        : null,
    })
  }

  const usuariosConGrupo = (usuarios ?? []).map((u: any) => ({
    ...u,
    colegio: u.colegio_id ? (colegiosMap.get(u.colegio_id) ?? null) : null,
    grupo_alumnos: gruposByAlumno[u.id] ?? [],
  }))

  return NextResponse.json({ usuarios: usuariosConGrupo })
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nombre, apellido, email, colegioId, grupoId, rol } = await request.json()
  const rolFinal = rol ?? 'admin_colegio'
  const admin = createAdminClient()

  if (rolFinal === 'alumno') {
    // Alumnos usan username + synthetic email
    if (!nombre || !apellido || !colegioId) {
      return NextResponse.json({ error: 'nombre, apellido y colegioId son requeridos' }, { status: 400 })
    }

    const baseUsername = `${nombre}.${apellido}`
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '')

    let username = baseUsername
    let counter = 1
    while (true) {
      const { data: exists } = await admin.from('perfiles').select('id').eq('username', username).single()
      if (!exists) break
      username = `${baseUsername}${counter++}`
    }

    const password = Math.random().toString(36).slice(-6).toUpperCase()

    const { data: colegio } = await admin.from('colegios').select('codigo').eq('id', colegioId).single()
    if (!colegio) return NextResponse.json({ error: 'Colegio no encontrado' }, { status: 404 })

    const syntheticEmail = `${username}@${colegio.codigo}.catequesis`

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
    })
    if (authError || !authUser.user) {
      return NextResponse.json({ error: authError?.message ?? 'Error al crear usuario' }, { status: 500 })
    }

    const { data: perfil, error: perfilError } = await admin.from('perfiles').insert({
      user_id: authUser.user.id,
      colegio_id: colegioId,
      nombre,
      apellido,
      email: email || null,
      username,
      rol: 'alumno',
    }).select().single()

    if (perfilError) {
      await admin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: perfilError.message }, { status: 500 })
    }

    if (grupoId) {
      await admin.from('grupo_alumnos').insert({ grupo_id: grupoId, alumno_id: perfil.id })
    }

    return NextResponse.json({ ok: true, username, password, perfilId: perfil.id })
  }

  // Para catequista y admin_colegio: email requerido
  if (!nombre || !apellido || !email || !colegioId) {
    return NextResponse.json({ error: 'nombre, apellido, email y colegioId son requeridos' }, { status: 400 })
  }

  const password = Math.random().toString(36).slice(-10)

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'Error al crear usuario' }, { status: 500 })
  }

  const { data: newPerfil, error: perfilError } = await admin.from('perfiles').insert({
    user_id: authUser.user.id,
    colegio_id: colegioId,
    nombre,
    apellido,
    email,
    rol: rolFinal,
  }).select('id').single()

  if (perfilError || !newPerfil) {
    await admin.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: perfilError?.message ?? 'Error al crear perfil' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, password, perfilId: newPerfil.id })
}
