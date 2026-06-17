import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'

async function getAdminColegio(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, rol, colegio_id')
    .eq('user_id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'admin_colegio') return null
  return perfil
}

export async function GET(request: NextRequest) {
  const perfil = await getAdminColegio(request)
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: gruposRaw } = await admin
    .from('grupos')
    .select('id, nombre, activo, catequista_id')
    .eq('colegio_id', perfil.colegio_id)
    .eq('activo', true)
    .order('nombre')

  const catIds = [...new Set((gruposRaw ?? []).filter((g: any) => g.catequista_id).map((g: any) => g.catequista_id))]
  const { data: cats } = catIds.length > 0
    ? await admin.from('perfiles').select('id, nombre, apellido, avatar_id').in('id', catIds)
    : { data: [] as any[] }
  const catMap = new Map((cats ?? []).map((c: any) => [c.id, c]))

  const grupoIds = (gruposRaw ?? []).map((g: any) => g.id)
  const { data: gaRows } = grupoIds.length > 0
    ? await admin.from('grupo_alumnos').select('alumno_id, grupo_id').in('grupo_id', grupoIds).eq('activo', true)
    : { data: [] as any[] }

  const gaByGrupo: Record<string, { alumno_id: string }[]> = {}
  for (const r of (gaRows ?? []) as any[]) {
    if (!gaByGrupo[r.grupo_id]) gaByGrupo[r.grupo_id] = []
    gaByGrupo[r.grupo_id].push({ alumno_id: r.alumno_id })
  }

  const grupos = (gruposRaw ?? []).map((g: any) => ({
    ...g,
    catequista: g.catequista_id ? (catMap.get(g.catequista_id) ?? null) : null,
    grupo_alumnos: gaByGrupo[g.id] ?? [],
  }))

  return NextResponse.json({ grupos })
}

export async function POST(request: NextRequest) {
  const perfil = await getAdminColegio(request)
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { nombre, catequista_id } = await request.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('grupos')
    .insert({ colegio_id: perfil.colegio_id, nombre: nombre.trim(), catequista_id: catequista_id || null })
    .select('id, nombre, activo, catequista:perfiles!grupos_catequista_id_fkey(id, nombre, apellido)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-assign all active libros to the new group
  const { data: libros } = await admin.from('libros').select('id').eq('activo', true)
  if (libros && libros.length > 0) {
    await admin.from('libro_grupos').upsert(
      libros.map(l => ({ libro_id: l.id, grupo_id: data.id, activo: true })),
      { ignoreDuplicates: true }
    )
  }

  return NextResponse.json({ ok: true, grupo: { ...data, grupo_alumnos: [] } })
}

export async function PATCH(request: NextRequest) {
  const perfil = await getAdminColegio(request)
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await request.json()
  const admin = createAdminClient()

  const { data: grupo } = await admin.from('grupos').select('colegio_id').eq('id', id).single()
  if (!grupo || grupo.colegio_id !== perfil.colegio_id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await admin.from('grupos').update({ activo: false }).eq('id', id)
  return NextResponse.json({ ok: true })
}
