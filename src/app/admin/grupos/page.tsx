import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AdminGruposClient from './AdminGruposClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Grupos' }

interface Props { searchParams: Promise<{ colegio?: string }> }

export default async function AdminGruposPage({ searchParams }: Props) {
  const { colegio: colegioId } = await searchParams
  const admin = createAdminClient()

  const { data: colegios } = await admin
    .from('colegios')
    .select('id, nombre, codigo')
    .eq('activo', true)
    .order('nombre')

  if (!colegioId) {
    return (
      <div className="min-h-dvh bg-slate-50">
        <div className="bg-slate-900 px-6 py-5 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Grupos</h1>
            <p className="text-slate-400 text-sm">Selecciona un colegio</p>
          </div>
        </div>
        <div className="px-6 py-6 max-w-2xl mx-auto space-y-3">
          {(colegios ?? []).map(c => (
            <Link
              key={c.id}
              href={`/admin/grupos?colegio=${c.id}`}
              className="card card-hover p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-700 font-bold text-sm">{c.codigo.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{c.nombre}</p>
                <p className="text-xs text-slate-400 font-mono">{c.codigo}</p>
              </div>
              <span className="text-slate-400 text-sm">Ver grupos →</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const colegio = (colegios ?? []).find(c => c.id === colegioId)

  const [
    { data: gruposRaw },
    { data: catequistas },
    { data: libros },
    { data: alumnosRaw },
    { data: libroGruposData },
    { data: grupoAlumnosData },
    { data: ciclos },
  ] = await Promise.all([
    admin
      .from('grupos')
      .select('id, nombre, activo, ciclo_id, created_at, catequista_id')
      .eq('colegio_id', colegioId)
      .order('nombre'),

    admin
      .from('perfiles')
      .select('id, nombre, apellido, avatar_id')
      .eq('colegio_id', colegioId)
      .eq('rol', 'catequista')
      .eq('activo', true)
      .order('nombre'),

    admin
      .from('libros')
      .select('id, titulo, portada_url')
      .eq('activo', true)
      .order('orden'),

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

    admin
      .from('grupo_alumnos')
      .select('alumno_id, grupo_id')
      .eq('activo', true),

    admin
      .from('ciclos')
      .select('id, nombre, activo')
      .order('orden', { ascending: false }),
  ])

  // Build lookup maps (avoids PostgREST INNER JOIN from embeds)
  const catequistaMap = new Map((catequistas ?? []).map((c: any) => [c.id, c]))
  const grupoIds = (gruposRaw ?? []).map((g: any) => g.id)
  const grupoIdSet = new Set(grupoIds)

  // alumno_ids per grupo
  const alumnosByGrupo: Record<string, { alumno_id: string }[]> = {}
  for (const ga of (grupoAlumnosData ?? []) as any[]) {
    if (!alumnosByGrupo[ga.grupo_id]) alumnosByGrupo[ga.grupo_id] = []
    alumnosByGrupo[ga.grupo_id].push({ alumno_id: ga.alumno_id })
  }

  // grupo info per alumno
  const grupoNombreMap = new Map((gruposRaw ?? []).map((g: any) => [g.id, g.nombre]))
  const gruposByAlumno: Record<string, { grupo_id: string; grupo: { id: string; nombre: string } | null }[]> = {}
  for (const ga of (grupoAlumnosData ?? []) as any[]) {
    if (!gruposByAlumno[ga.alumno_id]) gruposByAlumno[ga.alumno_id] = []
    gruposByAlumno[ga.alumno_id].push({
      grupo_id: ga.grupo_id,
      grupo: grupoNombreMap.has(ga.grupo_id) ? { id: ga.grupo_id, nombre: grupoNombreMap.get(ga.grupo_id)! } : null,
    })
  }

  const grupos = (gruposRaw ?? []).map((g: any) => ({
    ...g,
    catequista: g.catequista_id ? (catequistaMap.get(g.catequista_id) ?? null) : null,
    grupo_alumnos: alumnosByGrupo[g.id] ?? [],
  }))

  const alumnos = (alumnosRaw ?? []).map((a: any) => ({
    ...a,
    grupo_alumnos: gruposByAlumno[a.id] ?? [],
  }))

  const libroCountMap: Record<string, number> = {}
  for (const lg of (libroGruposData ?? []).filter((lg: any) => grupoIdSet.has(lg.grupo_id))) {
    if (!libroCountMap[lg.grupo_id]) libroCountMap[lg.grupo_id] = 0
    libroCountMap[lg.grupo_id]++
  }

  return (
    <div className="min-h-dvh bg-slate-50 pb-10">
      <div className="bg-slate-900 px-6 py-5 flex items-center gap-4">
        <Link href="/admin/grupos" className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Grupos</h1>
          <p className="text-slate-400 text-sm">{colegio?.nombre ?? colegioId}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        <AdminGruposClient
          grupos={(grupos ?? []) as any[]}
          catequistas={(catequistas ?? []) as any[]}
          libros={(libros ?? []) as any[]}
          alumnos={(alumnos ?? []) as any[]}
          ciclos={(ciclos ?? []) as any[]}
          libroCountMap={libroCountMap}
          colegioId={colegioId}
        />
      </div>
    </div>
  )
}
