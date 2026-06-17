import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const colegioId = request.nextUrl.searchParams.get('colegio_id')
  if (!colegioId) return NextResponse.json({ error: 'colegio_id requerido' }, { status: 400 })

  const cicloId = request.nextUrl.searchParams.get('ciclo_id')

  const admin = createAdminClient()

  // Fetch grupos y catequistas por separado (evita INNER JOIN implícito de PostgREST)
  let gruposQuery = admin
    .from('grupos')
    .select('id, nombre, activo, ciclo_id, created_at, catequista_id')
    .eq('colegio_id', colegioId)
    .order('nombre')

  if (cicloId) gruposQuery = gruposQuery.eq('ciclo_id', cicloId)

  const { data: gruposRaw, error } = await gruposQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const catequistaIds = [...new Set((gruposRaw ?? []).filter((g: any) => g.catequista_id).map((g: any) => g.catequista_id))]
  const { data: catequistas } = catequistaIds.length > 0
    ? await admin.from('perfiles').select('id, nombre, apellido, avatar_id').in('id', catequistaIds)
    : { data: [] as any[] }

  const catMap = new Map((catequistas ?? []).map((c: any) => [c.id, c]))
  const grupoIds = (gruposRaw ?? []).map((g: any) => g.id)

  const { data: gaRows } = grupoIds.length > 0
    ? await admin.from('grupo_alumnos').select('alumno_id, grupo_id').in('grupo_id', grupoIds).eq('activo', true)
    : { data: [] as any[] }

  const alumnosByGrupo: Record<string, { alumno_id: string }[]> = {}
  for (const ga of (gaRows ?? []) as any[]) {
    if (!alumnosByGrupo[ga.grupo_id]) alumnosByGrupo[ga.grupo_id] = []
    alumnosByGrupo[ga.grupo_id].push({ alumno_id: ga.alumno_id })
  }

  const grupos = (gruposRaw ?? []).map((g: any) => ({
    ...g,
    catequista: g.catequista_id ? (catMap.get(g.catequista_id) ?? null) : null,
    grupo_alumnos: alumnosByGrupo[g.id] ?? [],
  }))

  return NextResponse.json({ grupos })
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { colegio_id, nombre, catequista_id, ciclo_id } = await request.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  if (!colegio_id) return NextResponse.json({ error: 'colegio_id requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('grupos')
    .insert({ colegio_id, nombre: nombre.trim(), catequista_id: catequista_id || null, ciclo_id: ciclo_id || null })
    .select('id, nombre, activo, ciclo_id, catequista_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch catequista separately to avoid PostgREST INNER JOIN risk
  let catequista = null
  if (data.catequista_id) {
    const { data: cat } = await admin
      .from('perfiles')
      .select('id, nombre, apellido, avatar_id')
      .eq('id', data.catequista_id)
      .single()
    catequista = cat
  }

  // Auto-assign all active libros to the new group
  const { data: libros } = await admin.from('libros').select('id').eq('activo', true)
  if (libros && libros.length > 0) {
    await admin.from('libro_grupos').upsert(
      libros.map(l => ({ libro_id: l.id, grupo_id: data.id, activo: true })),
      { ignoreDuplicates: true }
    )
  }

  return NextResponse.json({ ok: true, grupo: { ...data, catequista, grupo_alumnos: [] } })
}
