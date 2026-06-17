import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'admin_colegio') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rolFiltro = searchParams.get('rol') ?? ''
  const sinGrupo = searchParams.get('sin_grupo') === '1'

  const admin = createAdminClient()
  const colegioId = perfil.colegio_id

  const { data: grupos } = await admin
    .from('grupos')
    .select('id, nombre, catequista_id')
    .eq('colegio_id', colegioId)
    .eq('activo', true)
    .order('nombre')

  const grupoIds = (grupos ?? []).map((g: any) => g.id)
  const rolFilter = rolFiltro && ['alumno', 'catequista', 'admin_colegio'].includes(rolFiltro)
    ? [rolFiltro]
    : ['alumno', 'catequista', 'admin_colegio']

  const { data: usuariosRaw } = await admin
    .from('perfiles')
    .select('*')
    .eq('colegio_id', colegioId)
    .in('rol', rolFilter)
    .order('nombre')

  const { data: grupoAlumnosRaw } = grupoIds.length > 0
    ? await admin.from('grupo_alumnos').select('alumno_id, grupo_id').in('grupo_id', grupoIds).eq('activo', true)
    : { data: [] as any[] }

  const grupoNombreMap = new Map((grupos ?? []).map((g: any) => [g.id, g.nombre]))

  const gruposByCatequista = new Map<string, { id: string; nombre: string }[]>()
  for (const g of grupos ?? [] as any[]) {
    if (!g.catequista_id) continue
    if (!gruposByCatequista.has(g.catequista_id)) gruposByCatequista.set(g.catequista_id, [])
    gruposByCatequista.get(g.catequista_id)!.push({ id: g.id, nombre: g.nombre })
  }

  const alumnoGrupoMap = new Map<string, { grupo: { id: string; nombre: string } }[]>()
  for (const ga of (grupoAlumnosRaw ?? []) as any[]) {
    if (!alumnoGrupoMap.has(ga.alumno_id)) alumnoGrupoMap.set(ga.alumno_id, [])
    if (grupoNombreMap.has(ga.grupo_id)) {
      alumnoGrupoMap.get(ga.alumno_id)!.push({
        grupo: { id: ga.grupo_id, nombre: grupoNombreMap.get(ga.grupo_id)! },
      })
    }
  }

  let usuarios = (usuariosRaw ?? []).map((u: any) => ({
    ...u,
    grupo_alumnos: alumnoGrupoMap.get(u.id) ?? [],
    grupos_catequista: gruposByCatequista.get(u.id) ?? [],
  }))

  if (sinGrupo) {
    usuarios = usuarios.filter((u: any) => u.rol === 'alumno' && (u.grupo_alumnos ?? []).length === 0)
  }

  return NextResponse.json({ usuarios })
}
