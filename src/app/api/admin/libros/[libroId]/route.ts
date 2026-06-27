import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ libroId: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { libroId } = await params
  const admin = createAdminClient()

  const { data: bloquesData } = await admin
    .from('bloques')
    .select('id, titulo, descripcion, orden, activo')
    .eq('libro_id', libroId)
    .eq('activo', true)
    .order('orden')

  const bloqueIds = (bloquesData ?? []).map((b: any) => b.id)

  const { data: hojasData } = bloqueIds.length > 0
    ? await admin
        .from('hojas')
        .select('id, titulo, tipo, imagen_url, orden, bloque_id, config')
        .in('bloque_id', bloqueIds)
        .eq('activo', true)
        .order('orden')
    : { data: [] as any[] }

  const bloques = (bloquesData ?? []).map((b: any) => ({
    ...b,
    hojas: (hojasData ?? []).filter((h: any) => h.bloque_id === b.id),
  }))

  const [{ data: gruposRaw }, { data: libroGruposActivos }] = await Promise.all([
    admin.from('grupos').select('id, nombre, colegio_id, colegios(id, nombre, codigo)').eq('activo', true).order('nombre'),
    admin.from('libro_grupos').select('grupo_id').eq('libro_id', libroId).eq('activo', true),
  ])

  const asignadosSet = new Set((libroGruposActivos ?? []).map((r: any) => r.grupo_id))
  const grupos = (gruposRaw ?? []).map((g: any) => ({
    id: g.id,
    nombre: g.nombre,
    asignado: asignadosSet.has(g.id),
    colegio_id: g.colegio_id,
    colegio_nombre: g.colegios?.nombre ?? g.colegio_id,
    colegio_codigo: g.colegios?.codigo ?? '',
  }))

  return NextResponse.json({ bloques, grupos })
}
