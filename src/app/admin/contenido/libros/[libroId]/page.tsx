import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import LibroAdminClient from './LibroAdminClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Gestionar libro' }

interface Props { params: Promise<{ libroId: string }> }

export default async function LibroAdminPage({ params }: Props) {
  const { libroId } = await params
  const admin = createAdminClient()

  const [
    { data: libro },
    { data: bloquesData },
    { data: gruposRaw },
    { data: libroGruposActivos },
  ] = await Promise.all([
    admin.from('libros').select('id, titulo').eq('id', libroId).single(),
    admin.from('bloques').select('id, titulo, descripcion, orden, activo').eq('libro_id', libroId).eq('activo', true),
    admin.from('grupos').select('id, nombre, colegio_id, colegios(id, nombre, codigo)').eq('activo', true).order('nombre'),
    admin.from('libro_grupos').select('grupo_id').eq('libro_id', libroId).eq('activo', true),
  ])

  if (!libro) notFound()

  const bloqueIds = (bloquesData ?? []).map(b => b.id)

  const { data: hojasData } = bloqueIds.length > 0
    ? await admin
        .from('hojas')
        .select('id, titulo, tipo, imagen_url, orden, bloque_id, config')
        .in('bloque_id', bloqueIds)
        .eq('activo', true)
    : { data: [] }

  const sortedBloques = (bloquesData ?? []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const sortedHojas = (hojasData ?? []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const bloques = sortedBloques.map(b => ({
    ...b,
    hojas: sortedHojas.filter(h => h.bloque_id === b.id),
  }))

  const asignadosSet = new Set((libroGruposActivos ?? []).map((r: any) => r.grupo_id))

  const grupos = (gruposRaw ?? []).map((g: any) => ({
    id: g.id,
    nombre: g.nombre,
    asignado: asignadosSet.has(g.id),
    colegio_id: g.colegio_id,
    colegio_nombre: g.colegios?.nombre ?? g.colegio_id,
    colegio_codigo: g.colegios?.codigo ?? '',
  }))

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5">
        <a href="/admin/contenido" className="text-slate-400 text-sm hover:text-white">← Contenido</a>
        <h1 className="text-xl font-bold text-white mt-1">{libro.titulo}</h1>
        <p className="text-slate-400 text-sm">{bloques.length} bloques · {(hojasData ?? []).length} páginas en total</p>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto">
        <LibroAdminClient
          libro={{ ...libro, bloques } as any}
          grupos={grupos}
          libroId={libroId}
        />
      </div>
    </div>
  )
}
