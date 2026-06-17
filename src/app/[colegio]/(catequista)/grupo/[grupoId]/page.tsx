import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GrupoAlumnosClient from './GrupoAlumnosClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Mi grupo' }

interface Props {
  params: Promise<{ colegio: string; grupoId: string }>
}

export default async function GrupoPage({ params }: Props) {
  const { colegio: codigo, grupoId } = await params
  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'catequista') redirect(`/${codigo}/login`)

  const admin = createAdminClient()

  // Verify this group belongs to catequista
  const { data: grupo } = await admin
    .from('grupos')
    .select('id, nombre')
    .eq('id', grupoId)
    .eq('catequista_id', perfil.id)
    .single()

  if (!grupo) redirect(`/${codigo}/grupo`)

  // Get current active students in this group
  const { data: gaRows } = await admin
    .from('grupo_alumnos')
    .select('alumno_id')
    .eq('grupo_id', grupoId)
    .eq('activo', true)

  const alumnoIds = (gaRows ?? []).map(r => r.alumno_id)

  const alumnos = alumnoIds.length > 0
    ? ((await admin.from('perfiles').select('id, nombre, apellido, avatar_id, activo').in('id', alumnoIds)).data ?? [])
    : []

  // Books assigned to this group
  const { data: lgRows } = await admin
    .from('libro_grupos')
    .select('libro_id')
    .eq('grupo_id', grupoId)
    .eq('activo', true)

  const libroIds = (lgRows ?? []).map(r => r.libro_id)

  const [librosBase, bloquesBase, visitasRaw, entregasRaw] = await Promise.all([
    libroIds.length > 0
      ? admin.from('libros').select('id, titulo').in('id', libroIds)
      : Promise.resolve({ data: [] as any[] }),
    libroIds.length > 0
      ? admin.from('bloques').select('id, titulo, libro_id').in('libro_id', libroIds).eq('activo', true).order('orden')
      : Promise.resolve({ data: [] as any[] }),
    alumnoIds.length > 0
      ? admin.from('visitas_hojas').select('alumno_id, ultima_visita').in('alumno_id', alumnoIds)
      : Promise.resolve({ data: [] as any[] }),
    alumnoIds.length > 0
      ? admin.from('entregas').select('id, alumno_id, hoja_id, estado, fecha_entrega').in('alumno_id', alumnoIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  // Fetch comments for 'entregado' submissions to know which need feedback
  const entregaIdsEntregadas = (entregasRaw.data ?? [])
    .filter((e: any) => e.estado === 'entregado' && e.id)
    .map((e: any) => e.id)
  const { data: comentariosData } = entregaIdsEntregadas.length > 0
    ? await admin.from('comentarios').select('entrega_id').in('entrega_id', entregaIdsEntregadas)
    : { data: [] as any[] }
  const comentadosSet = new Set((comentariosData ?? []).map((c: any) => c.entrega_id))

  // Per-alumno pending feedback count
  const pendienteCountMap: Record<string, number> = {}
  for (const e of entregasRaw.data ?? []) {
    if (e.estado === 'entregado' && e.id && !comentadosSet.has(e.id)) {
      pendienteCountMap[e.alumno_id] = (pendienteCountMap[e.alumno_id] ?? 0) + 1
    }
  }

  const bloqueIds = (bloquesBase.data ?? []).map((b: any) => b.id)
  const { data: hojasBase } = bloqueIds.length > 0
    ? await admin.from('hojas').select('id, titulo, tipo, bloque_id').in('bloque_id', bloqueIds).eq('activo', true).order('orden')
    : { data: [] as any[] }

  // Build per-alumno stats for the "por alumno" view
  const ultimaVisitaMap: Record<string, string> = {}
  for (const v of visitasRaw.data ?? []) {
    if (!ultimaVisitaMap[v.alumno_id] || v.ultima_visita > ultimaVisitaMap[v.alumno_id])
      ultimaVisitaMap[v.alumno_id] = v.ultima_visita
  }
  const visitasCountMap: Record<string, number> = {}
  for (const v of visitasRaw.data ?? [])
    visitasCountMap[v.alumno_id] = (visitasCountMap[v.alumno_id] ?? 0) + 1

  const entregasCountMap: Record<string, { entregado: number; borrador: number }> = {}
  for (const e of entregasRaw.data ?? []) {
    if (!entregasCountMap[e.alumno_id]) entregasCountMap[e.alumno_id] = { entregado: 0, borrador: 0 }
    if (e.estado === 'entregado') entregasCountMap[e.alumno_id].entregado++
    else if (e.estado === 'borrador') entregasCountMap[e.alumno_id].borrador++
  }

  const alumnosConStats = alumnos.map((a: any) => {
    const entregado = entregasCountMap[a.id]?.entregado ?? 0
    const borrador = entregasCountMap[a.id]?.borrador ?? 0
    const visitas = visitasCountMap[a.id] ?? 0
    return {
      id: a.id,
      nombre: a.nombre,
      apellido: a.apellido,
      avatar_id: a.avatar_id,
      entregado,
      borrador,
      visitas,
      ultimaVisita: ultimaVisitaMap[a.id],
      pendientesFeedback: pendienteCountMap[a.id] ?? 0,
      sinActividad: visitas === 0 && entregado === 0 && borrador === 0,
    }
  })

  // Build "por libro" structure
  // entregasMap: `alumnoId:hojaId` → { estado, fecha_entrega }
  const entregasMap: Record<string, { estado: string; fecha?: string }> = {}
  for (const e of entregasRaw.data ?? []) {
    entregasMap[`${e.alumno_id}:${e.hoja_id}`] = { estado: e.estado, fecha: e.fecha_entrega }
  }

  const hojasByBloque = new Map<string, any[]>()
  for (const h of hojasBase ?? []) {
    if (!hojasByBloque.has(h.bloque_id)) hojasByBloque.set(h.bloque_id, [])
    hojasByBloque.get(h.bloque_id)!.push(h)
  }

  const bloquesByLibro = new Map<string, any[]>()
  for (const b of bloquesBase.data ?? []) {
    if (!bloquesByLibro.has(b.libro_id)) bloquesByLibro.set(b.libro_id, [])
    bloquesByLibro.get(b.libro_id)!.push({ ...b, hojas: hojasByBloque.get(b.id) ?? [] })
  }

  const libros = (librosBase.data ?? []).map((l: any) => ({
    id: l.id,
    titulo: l.titulo,
    bloques: bloquesByLibro.get(l.id) ?? [],
  }))

  // Minimal alumno info for "por libro" view
  const alumnosBasicos = alumnos.map((a: any) => ({
    id: a.id,
    nombre: a.nombre,
    apellido: a.apellido,
    avatar_id: a.avatar_id,
  }))

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10">
        <Link href={`/${codigo}/grupo`} className="text-brand-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{grupo.nombre}</h1>
          <p className="text-sm text-slate-400">{alumnos.length} alumnos</p>
        </div>
      </div>

      <GrupoAlumnosClient
        alumnos={alumnosConStats}
        alumnosBasicos={alumnosBasicos}
        libros={libros}
        entregasMap={entregasMap}
        codigo={codigo}
      />
    </div>
  )
}
