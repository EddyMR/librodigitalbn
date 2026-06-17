import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase'
import HojaViewer from '@/components/libro/HojaViewer'
import HojaNav from '@/components/libro/HojaNav'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ colegio: string; libroId: string; bloqueId: string; hojaId: string }>
}

export const metadata: Metadata = { title: 'Lectura' }

export default async function HojaPage({ params }: Props) {
  const { colegio: codigo, libroId, bloqueId, hojaId } = await params
  const perfil = await getSession()
  if (!perfil) redirect(`/${codigo}/login`)

  const admin = createAdminClient()

  // Get current hoja with zones (admin bypasses RLS so tipo is always readable)
  const { data: hoja } = await admin
    .from('hojas')
    .select('*, zonas_escritura(*, orden)')
    .eq('id', hojaId)
    .eq('activo', true)
    .single()

  if (!hoja) notFound()

  // Get all hojas in this bloque (for navigation)
  const { data: todasHojasRaw } = await admin
    .from('hojas')
    .select('id, titulo, tipo, orden')
    .eq('bloque_id', bloqueId)
    .eq('activo', true)
  const todasHojas = (todasHojasRaw ?? []).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  // Get bloque title for nav header
  const { data: bloque } = await admin
    .from('bloques')
    .select('titulo, libro_id')
    .eq('id', bloqueId)
    .single()

  // Get existing entrega + comment if alumno (use session client with RLS)
  let entrega = null
  let comentario = null

  if (perfil.rol === 'alumno') {
    const supabase = await createServerSupabaseClient()
    const { data: e } = await supabase
      .from('entregas')
      .select('*')
      .eq('alumno_id', perfil.id)
      .eq('hoja_id', hojaId)
      .single()
    entrega = e

    if (e) {
      const { data: c } = await supabase
        .from('comentarios')
        .select('*, catequista:perfiles(nombre, apellido, avatar_id)')
        .eq('entrega_id', e.id)
        .eq('publicado', true)
        .single()
      comentario = c
    }
  }

  const hojas = todasHojas ?? []
  const hojaIndex = hojas.findIndex(h => h.id === hojaId)

  const prevHoja = hojaIndex > 0 ? hojas[hojaIndex - 1] : null
  const nextHoja = hojaIndex < hojas.length - 1 ? hojas[hojaIndex + 1] : null

  return (
    <div className="min-h-dvh flex flex-col bg-black">
      {/* Navigation header */}
      <HojaNav
        codigo={codigo}
        libroId={libroId}
        bloqueId={bloqueId}
        bloqueTitle={bloque?.titulo ?? ''}
        hojaIndex={hojaIndex}
        totalHojas={hojas.length}
        prevHojaId={prevHoja?.id}
        nextHojaId={nextHoja?.id}
        hojas={hojas}
      />

      {/* Main hoja viewer */}
      <div className="flex-1">
        <HojaViewer
          hoja={hoja as any}
          alumnoId={perfil.rol === 'alumno' ? perfil.id : undefined}
          entregaExistente={entrega}
          comentarioCatequista={comentario}
          codigo={codigo}
          bloqueId={bloqueId}
          libroId={libroId}
          nextHojaId={nextHoja?.id}
        />
      </div>
    </div>
  )
}
