import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { avatarUrl, nombreCompleto, formatFechaHora, formatRelativo } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import ComentarioForm from '@/components/catequista/ComentarioForm'
import QRGenerador from '@/components/catequista/QRGenerador'
import { ArrowLeft, Eye, CheckCircle2, Clock, MessageSquare, BookOpen, Camera, Mic, ListChecks } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ colegio: string; alumnoId: string }>
}

export const metadata: Metadata = { title: 'Progreso del alumno' }

export default async function AlumnoDetallePage({ params }: Props) {
  const { colegio: codigo, alumnoId } = await params
  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'catequista') redirect(`/${codigo}/login`)

  const admin = createAdminClient()

  // Verify this student belongs to catequista's group (flat query)
  const { data: gaRow } = await admin
    .from('grupo_alumnos')
    .select('grupo_id')
    .eq('alumno_id', alumnoId)
    .single()

  if (!gaRow) notFound()

  const { data: grupo } = await admin
    .from('grupos')
    .select('catequista_id')
    .eq('id', gaRow.grupo_id)
    .single()

  if (grupo?.catequista_id !== perfil.id) notFound()

  const grupoId = gaRow.grupo_id

  // Get alumno profile
  const { data: alumno } = await admin
    .from('perfiles')
    .select('*')
    .eq('id', alumnoId)
    .single()

  if (!alumno) notFound()

  // Get books assigned to the group — flat queries to avoid unreliable deep joins
  const { data: lgRows } = await admin
    .from('libro_grupos')
    .select('libro_id')
    .eq('grupo_id', grupoId)
    .eq('activo', true)

  const libroIds = (lgRows ?? []).map((r: any) => r.libro_id)

  const [librosBase, bloquesBase] = libroIds.length > 0
    ? await Promise.all([
        admin.from('libros').select('id, titulo').in('id', libroIds),
        admin.from('bloques').select('id, titulo, libro_id').in('libro_id', libroIds).eq('activo', true).order('orden'),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }]

  const bloqueIds = (bloquesBase.data ?? []).map((b: any) => b.id)

  const { data: hojasBase } = bloqueIds.length > 0
    ? await admin.from('hojas').select('id, titulo, tipo, config, imagen_url, bloque_id').in('bloque_id', bloqueIds).eq('activo', true).order('orden')
    : { data: [] as any[] }

  // Reconstruct nested structure
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
    ...l, bloques: bloquesByLibro.get(l.id) ?? [],
  }))

  const allHojaIds = (hojasBase ?? []).map((h: any) => h.id)

  const [{ data: visitas }, { data: entregas }] = allHojaIds.length > 0
    ? await Promise.all([
        admin.from('visitas_hojas').select('*').eq('alumno_id', alumnoId).in('hoja_id', allHojaIds),
        admin.from('entregas').select('*, comentarios(*)').eq('alumno_id', alumnoId).in('hoja_id', allHojaIds),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }]

  const visitasMap = new Map((visitas ?? []).map(v => [v.hoja_id, v]))
  const entregasMap = new Map((entregas ?? []).map(e => [e.hoja_id, e]))

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-5 border-b border-slate-100 space-y-4">
        <Link href={`/${codigo}/grupo/${grupoId}`} className="inline-flex items-center gap-1.5 text-brand-500 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver al grupo
        </Link>

        <div className="flex items-center gap-4">
          <Image src={avatarUrl(alumno.avatar_id)} alt="Avatar" width={64} height={64} className="rounded-2xl" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{nombreCompleto(alumno)}</h1>
            <p className="text-sm text-slate-500">@{alumno.username}</p>
            {alumno.mini_bio && <p className="text-sm text-slate-600 mt-1 italic">"{alumno.mini_bio}"</p>}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Páginas vistas', value: visitas?.length ?? 0, icon: Eye, color: 'text-brand-600' },
            { label: 'Entregadas', value: entregas?.filter(e => e.estado === 'entregado').length ?? 0, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Borradores', value: entregas?.filter(e => e.estado === 'borrador').length ?? 0, icon: Clock, color: 'text-amber-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-50 rounded-xl p-3 text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* QR Generator */}
        <QRGenerador alumnoId={alumno.id} alumnoNombre={nombreCompleto(alumno)} codigoColegio={codigo} />
      </div>

      {/* Books breakdown */}
      <div className="px-4 pt-4 space-y-4">
        {libros.map((libro: any) => (
          <div key={libro.id} className="card overflow-hidden">
            {/* Book header */}
            <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-600" />
              <h2 className="font-semibold text-brand-900 text-sm">{libro.titulo}</h2>
            </div>

            {/* Hojas list */}
            <div className="divide-y divide-slate-50">
              {libro.bloques?.flatMap((bloque: any) =>
                bloque.hojas?.map((hoja: any) => {
                  const visita = visitasMap.get(hoja.id)
                  const entrega = entregasMap.get(hoja.id)
                  const comentarios = entrega?.comentarios ?? []
                  const tieneComentario = comentarios.length > 0

                  return (
                    <div key={hoja.id} className="px-4 py-3 space-y-2">
                      {/* Hoja info */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">
                            {hoja.titulo ?? `Bloque: ${bloque.titulo}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {visita ? (
                              <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                <Eye className="w-3 h-3" /> {visita.visitas_count}x · última {formatRelativo(visita.ultima_visita)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">No visitada</span>
                            )}

                            {hoja.tipo !== 'lectura' && (
                              <>
                                {entrega?.estado === 'entregado' ? (
                                  <span className="badge-entregado">
                                    <CheckCircle2 className="w-3 h-3" /> Entregado
                                  </span>
                                ) : entrega?.estado === 'borrador' ? (
                                  <span className="badge-borrador">Borrador</span>
                                ) : (
                                  <span className="badge-pendiente">Pendiente</span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Show submission content */}
                          {entrega && entrega.contenido?.dibujo_url && (
                            <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={hoja.imagen_url} alt="Página" className="w-full block" />
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={entrega.contenido.dibujo_url}
                                alt="Dibujo del alumno"
                                className="absolute inset-0 w-full h-full"
                                style={{ objectFit: 'fill' }}
                              />
                            </div>
                          )}
                          {entrega && !entrega.contenido?.dibujo_url && entrega.contenido?.texto && (
                            <div className="mt-2 bg-slate-50 rounded-lg p-2.5 text-sm text-slate-700 whitespace-pre-wrap">
                              {entrega.contenido.texto}
                            </div>
                          )}
                          {entrega && entrega.contenido?.foto_url && (
                            <div className="mt-2">
                              <Image
                                src={entrega.contenido.foto_url}
                                alt="Foto del alumno"
                                width={300}
                                height={200}
                                className="rounded-xl object-cover max-h-48 w-full"
                              />
                            </div>
                          )}
                          {entrega && entrega.contenido?.audio_url && (
                            <div className="mt-2 bg-purple-50 rounded-lg p-2.5 flex items-center gap-2">
                              <Mic className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              <audio src={entrega.contenido.audio_url} controls className="flex-1 h-8" style={{ height: '32px' }} />
                            </div>
                          )}
                          {entrega && entrega.contenido?.respuestas && hoja.tipo === 'cuestionario' && (
                            <div className="mt-2 space-y-2">
                              {((hoja as any).config?.preguntas as string[] ?? []).map((pregunta: string, i: number) => (
                                <div key={i} className="bg-amber-50 rounded-lg p-2.5 space-y-1">
                                  <p className="text-xs font-semibold text-amber-700">{i + 1}. {pregunta}</p>
                                  {entrega.contenido?.respuestas?.[i] ? (
                                    <p className="text-sm text-slate-700">{entrega.contenido.respuestas[i]}</p>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">Sin respuesta</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {entrega?.fecha_entrega && (
                            <p className="text-xs text-slate-400 mt-1">
                              Entregado: {formatFechaHora(entrega.fecha_entrega)}
                              {entrega.fecha_modificacion && entrega.fecha_modificacion !== entrega.fecha_entrega && (
                                <span className="text-amber-500"> · Modificado: {formatFechaHora(entrega.fecha_modificacion)}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Comment section */}
                      {entrega && hoja.tipo !== 'lectura' && (
                        <ComentarioForm
                          entregaId={entrega.id}
                          catequistaId={perfil.id}
                          comentarioExistente={comentarios[0] ?? null}
                        />
                      )}
                    </div>
                  )
                }) ?? []
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
