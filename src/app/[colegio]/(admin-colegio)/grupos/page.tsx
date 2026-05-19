import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GruposClient from './GruposClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Grupos' }

interface Props { params: Promise<{ colegio: string }> }

export default async function GruposPage({ params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'admin_colegio') redirect(`/${codigo}/login`)

  const admin = createAdminClient()
  const colegioId = perfil.colegio_id

  const [
    { data: grupos },
    { data: catequistas },
    { data: libros },
    { data: alumnosRaw },
    { data: libroGruposData },
  ] = await Promise.all([
    admin
      .from('grupos')
      .select(`
        id, nombre, activo, created_at,
        catequista:perfiles!grupos_catequista_id_fkey(id, nombre, apellido, avatar_id),
        grupo_alumnos(alumno_id)
      `)
      .eq('colegio_id', colegioId)
      .order('nombre'),

    admin
      .from('perfiles')
      .select('id, nombre, apellido, avatar_id')
      .eq('colegio_id', colegioId)
      .eq('rol', 'catequista')
      .order('nombre'),

    admin
      .from('libros')
      .select('id, titulo, portada_url')
      .eq('activo', true)
      .order('orden'),

    // Flat query — no nested PostgREST join
    admin
      .from('perfiles')
      .select('id, nombre, apellido, avatar_id, activo')
      .eq('colegio_id', colegioId)
      .eq('rol', 'alumno')
      .order('nombre'),

    admin
      .from('libro_grupos')
      .select('grupo_id, libro_id')
      .eq('activo', true),
  ])

  // Fetch grupo_alumnos flat, filtered to this colegio's groups
  const grupoIds = (grupos ?? []).map(g => g.id)
  const { data: grupoAlumnosRaw } = grupoIds.length > 0
    ? await admin.from('grupo_alumnos').select('alumno_id, grupo_id').in('grupo_id', grupoIds)
    : { data: [] }

  // Build enriched alumnos with grupo info
  const grupoNombreMap = new Map((grupos ?? []).map(g => [g.id, (g as any).nombre as string]))
  const alumnoGrupoMap = new Map<string, { grupo_id: string; grupo: { id: string; nombre: string } | null }[]>()
  for (const ga of grupoAlumnosRaw ?? []) {
    if (!alumnoGrupoMap.has(ga.alumno_id)) alumnoGrupoMap.set(ga.alumno_id, [])
    alumnoGrupoMap.get(ga.alumno_id)!.push({
      grupo_id: ga.grupo_id,
      grupo: grupoNombreMap.has(ga.grupo_id)
        ? { id: ga.grupo_id, nombre: grupoNombreMap.get(ga.grupo_id)! }
        : null,
    })
  }
  const alumnos = (alumnosRaw ?? []).map(a => ({
    ...a,
    grupo_alumnos: alumnoGrupoMap.get(a.id) ?? [],
  }))

  // Libro count per group — filter to this colegio's groups only
  const grupoIdSet = new Set(grupoIds)
  const libroCountMap: Record<string, number> = {}
  for (const lg of (libroGruposData ?? []).filter(lg => grupoIdSet.has(lg.grupo_id))) {
    if (!libroCountMap[lg.grupo_id]) libroCountMap[lg.grupo_id] = 0
    libroCountMap[lg.grupo_id]++
  }

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10">
        <Link href={`/${codigo}/dashboard`} className="text-brand-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 flex-1">Grupos</h1>
      </div>

      <GruposClient
        grupos={(grupos ?? []) as any[]}
        catequistas={(catequistas ?? []) as any[]}
        libros={(libros ?? []) as any[]}
        alumnos={alumnos as any[]}
        libroCountMap={libroCountMap}
        colegioId={colegioId}
        codigoColegio={codigo}
      />
    </div>
  )
}
