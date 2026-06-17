import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Lock } from 'lucide-react'
import { porcentaje } from '@/lib/utils'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ colegio: string; libroId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { libroId } = await params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('libros').select('titulo').eq('id', libroId).single()
  return { title: data?.titulo ?? 'Libro' }
}

export default async function LibroPage({ params }: Props) {
  const { colegio: codigo, libroId } = await params
  const perfil = await getSession()
  if (!perfil) redirect(`/${codigo}/login`)

  const supabase = await createServerSupabaseClient()

  const { data: libroRaw } = await supabase
    .from('libros')
    .select('*, bloques(id, titulo, descripcion, orden, hojas(id, tipo, orden))')
    .eq('id', libroId)
    .eq('activo', true)
    .single()

  if (!libroRaw) notFound()

  // Sort nested bloques and hojas in JS (avoids PostgREST order+select conflict on 'orden')
  const libro = {
    ...libroRaw,
    bloques: ((libroRaw as any).bloques ?? [])
      .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((b: any) => ({
        ...b,
        hojas: (b.hojas ?? []).sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0)),
      })),
  }

  // Get visit data for this student (if alumno)
  let visitedIds = new Set<string>()
  let entregaHojaIds = new Set<string>()

  if (perfil.rol === 'alumno') {
    const allHojaIds = (libro.bloques ?? []).flatMap((b: any) => (b.hojas ?? []).map((h: any) => h.id))

    const [{ data: visitas }, { data: entregas }] = await Promise.all([
      supabase.from('visitas_hojas').select('hoja_id').eq('alumno_id', perfil.id).in('hoja_id', allHojaIds),
      supabase.from('entregas').select('hoja_id').eq('alumno_id', perfil.id).eq('estado', 'entregado').in('hoja_id', allHojaIds),
    ])

    visitedIds = new Set(visitas?.map(v => v.hoja_id) ?? [])
    entregaHojaIds = new Set(entregas?.map(e => e.hoja_id) ?? [])
  }

  const allHojas = (libro.bloques ?? []).flatMap((b: any) => b.hojas ?? [])
  const totalHojas = allHojas.length
  const visitadas = allHojas.filter((h: any) => visitedIds.has(h.id)).length
  const pct = porcentaje(visitadas, totalHojas)

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      {/* Hero header */}
      <div className="bg-brand-600 px-4 pt-4 pb-8 space-y-4">
        <Link href={`/${codigo}/inicio`} className="inline-flex items-center gap-1.5 text-brand-200 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" />
          Mis libros
        </Link>

        <div className="flex gap-4 items-center">
          {libro.portada_url ? (
            <Image src={libro.portada_url} alt={libro.titulo} width={64} height={84} className="rounded-xl shadow-lg object-cover" />
          ) : (
            <div className="w-16 h-20 rounded-xl bg-brand-500 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-brand-200" />
            </div>
          )}
          <div className="flex-1 text-white">
            <h1 className="text-xl font-bold">{libro.titulo}</h1>
            {libro.descripcion && <p className="text-brand-200 text-sm mt-0.5">{libro.descripcion}</p>}
            <p className="text-brand-200 text-sm mt-1">{(libro.bloques ?? []).length} bloques · {totalHojas} páginas</p>
          </div>
        </div>

        {/* Progress bar */}
        {perfil.rol === 'alumno' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-brand-200">
              <span>Progreso</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-brand-500 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Bloques */}
      <div className="px-4 -mt-4 space-y-3">
        {(libro.bloques ?? []).map((bloque: any, idx: number) => {
          const hojas = bloque.hojas ?? []
          const bloqueVisitadas = hojas.filter((h: any) => visitedIds.has(h.id)).length
          const bloqueEntregadas = hojas.filter((h: any) => entregaHojaIds.has(h.id)).length
          const bloquePct = porcentaje(bloqueVisitadas, hojas.length)
          const firstHoja = hojas[0]

          return (
            <Link
              key={bloque.id}
              href={firstHoja ? `/${codigo}/libros/${libroId}/${bloque.id}/${firstHoja.id}` : '#'}
              className="card card-hover p-4 block space-y-3"
            >
              <div className="flex items-start gap-3">
                {/* Block number */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold
                  ${bloqueVisitadas === hojas.length && hojas.length > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-brand-100 text-brand-700'
                  }`}>
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{bloque.titulo}</p>
                  {bloque.descripcion && (
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{bloque.descripcion}</p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Circle className="w-3 h-3" />
                      {hojas.length} páginas
                    </span>
                    {perfil.rol === 'alumno' && bloqueEntregadas > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        {bloqueEntregadas} entregadas
                      </span>
                    )}
                  </div>
                </div>

                {perfil.rol === 'alumno' && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-medium text-brand-600">{bloquePct}%</p>
                  </div>
                )}
              </div>

              {/* Mini progress */}
              {perfil.rol === 'alumno' && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${bloquePct}%` }} />
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
