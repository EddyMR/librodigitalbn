'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search, X, Eye, CheckCircle2, Clock, ChevronRight,
  BookOpen, Users, ChevronDown, ChevronUp, MessageSquareDot,
  AlertCircle, LayoutDashboard,
} from 'lucide-react'
import { avatarUrl, nombreCompleto, formatRelativo, formatFechaHora } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Alumno {
  id: string
  nombre: string
  apellido: string
  avatar_id: number
  entregado: number
  borrador: number
  visitas: number
  ultimaVisita?: string
  pendientesFeedback: number
  sinActividad: boolean
}

interface AlumnoBasico {
  id: string
  nombre: string
  apellido: string
  avatar_id: number
}

interface Hoja {
  id: string
  titulo?: string
  tipo: string
}

interface Bloque {
  id: string
  titulo: string
  hojas: Hoja[]
}

interface Libro {
  id: string
  titulo: string
  bloques: Bloque[]
}

interface Props {
  alumnos: Alumno[]
  alumnosBasicos: AlumnoBasico[]
  libros: Libro[]
  entregasMap: Record<string, { estado: string; fecha?: string }>
  codigo: string
}

const tipoLabel: Record<string, string> = {
  lectura: 'Lectura',
  escritura_libre: 'Texto',
  escritura_imagen: 'Dibujo',
  foto: 'Foto',
  audio: 'Audio',
  cuestionario: 'Cuestionario',
  multimedia: 'Multimedia',
}

const tipoColor: Record<string, string> = {
  lectura: 'bg-slate-100 text-slate-500',
  escritura_libre: 'bg-blue-100 text-blue-600',
  escritura_imagen: 'bg-purple-100 text-purple-600',
  foto: 'bg-green-100 text-green-600',
  audio: 'bg-amber-100 text-amber-600',
  cuestionario: 'bg-pink-100 text-pink-600',
  multimedia: 'bg-indigo-100 text-indigo-600',
}

export default function GrupoAlumnosClient({ alumnos, alumnosBasicos, libros, entregasMap, codigo }: Props) {
  const [vista, setVista] = useState<'resumen' | 'alumnos' | 'libros'>('resumen')
  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return alumnos
    const q = busqueda.toLowerCase()
    return alumnos.filter(a =>
      a.nombre.toLowerCase().includes(q) ||
      a.apellido.toLowerCase().includes(q)
    )
  }, [busqueda, alumnos])

  const totalPendientes = useMemo(
    () => alumnos.filter(a => a.pendientesFeedback > 0).length,
    [alumnos]
  )

  return (
    <div className="px-4 pt-4 space-y-3">
      {/* View toggle */}
      <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
        <button
          onClick={() => setVista('resumen')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all relative',
            vista === 'resumen' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
          )}
        >
          <LayoutDashboard className="w-3.5 h-3.5" /> Resumen
          {totalPendientes > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalPendientes > 9 ? '9+' : totalPendientes}
            </span>
          )}
        </button>
        <button
          onClick={() => setVista('alumnos')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
            vista === 'alumnos' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
          )}
        >
          <Users className="w-3.5 h-3.5" /> Por alumno
        </button>
        <button
          onClick={() => setVista('libros')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
            vista === 'libros' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
          )}
        >
          <BookOpen className="w-3.5 h-3.5" /> Por libro
        </button>
      </div>

      {vista === 'resumen' && (
        <VistaResumen alumnos={alumnos} codigo={codigo} />
      )}

      {vista === 'alumnos' && (
        <VistaAlumnos alumnos={alumnos} filtrados={filtrados} busqueda={busqueda} setBusqueda={setBusqueda} codigo={codigo} />
      )}

      {vista === 'libros' && (
        <VistaLibros libros={libros} alumnos={alumnosBasicos} entregasMap={entregasMap} codigo={codigo} />
      )}
    </div>
  )
}

// ── Vista resumen ───────────────────────────────────────────────
function VistaResumen({ alumnos, codigo }: { alumnos: Alumno[]; codigo: string }) {
  const pendientes = alumnos.filter(a => a.pendientesFeedback > 0)
  const sinActividad = alumnos.filter(a => a.sinActividad)
  const alDia = alumnos.filter(a => !a.pendientesFeedback && !a.sinActividad)

  if (alumnos.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-400">Este grupo no tiene alumnos aún</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{alumnos.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Alumnos</p>
        </div>
        <div className={cn('card p-3 text-center', pendientes.length > 0 ? 'bg-amber-50 border-amber-100' : '')}>
          <p className={cn('text-2xl font-bold', pendientes.length > 0 ? 'text-amber-600' : 'text-slate-300')}>
            {pendientes.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Por revisar</p>
        </div>
        <div className={cn('card p-3 text-center', sinActividad.length > 0 ? 'bg-red-50 border-red-100' : '')}>
          <p className={cn('text-2xl font-bold', sinActividad.length > 0 ? 'text-red-500' : 'text-slate-300')}>
            {sinActividad.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Sin actividad</p>
        </div>
      </div>

      {/* Pending feedback */}
      {pendientes.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquareDot className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-700">Esperando revisión ({pendientes.length})</h3>
          </div>
          {pendientes.map(a => (
            <AlumnoResumenCard key={a.id} alumno={a} codigo={codigo} variant="warning" />
          ))}
        </section>
      )}

      {/* Inactive */}
      {sinActividad.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-500">Sin actividad ({sinActividad.length})</h3>
          </div>
          {sinActividad.map(a => (
            <AlumnoResumenCard key={a.id} alumno={a} codigo={codigo} variant="danger" />
          ))}
        </section>
      )}

      {/* On track */}
      {alDia.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-green-700">Al día ({alDia.length})</h3>
          </div>
          {alDia.length <= 4 ? (
            alDia.map(a => (
              <AlumnoResumenCard key={a.id} alumno={a} codigo={codigo} variant="success" />
            ))
          ) : (
            <div className="card p-3 flex flex-wrap gap-2">
              {alDia.map(a => (
                <a
                  key={a.id}
                  href={`/${codigo}/alumno/${a.id}`}
                  title={`${a.nombre} ${a.apellido}`}
                  className="block"
                >
                  <Image
                    src={avatarUrl(a.avatar_id)}
                    alt={nombreCompleto(a)}
                    width={40}
                    height={40}
                    className="rounded-xl ring-2 ring-green-200 hover:ring-green-400 transition-all"
                  />
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {pendientes.length === 0 && sinActividad.length === 0 && (
        <div className="card p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">¡Todo al día!</p>
            <p className="text-xs text-slate-400">No hay entregas pendientes de revisión</p>
          </div>
        </div>
      )}
    </div>
  )
}

function AlumnoResumenCard({
  alumno, codigo, variant,
}: {
  alumno: Alumno
  codigo: string
  variant: 'warning' | 'danger' | 'success'
}) {
  const colors = {
    warning: 'border-amber-100 hover:border-amber-200',
    danger: 'border-red-100 hover:border-red-200',
    success: 'border-green-100 hover:border-green-200',
  }

  return (
    <a
      href={`/${codigo}/alumno/${alumno.id}`}
      className={cn('card p-3 flex items-center gap-3 transition-colors', colors[variant])}
    >
      <Image
        src={avatarUrl(alumno.avatar_id)}
        alt={nombreCompleto(alumno)}
        width={40}
        height={40}
        className="rounded-xl flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{nombreCompleto(alumno)}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {variant === 'warning' && (
            <span className="text-xs text-amber-600 font-medium">
              {alumno.pendientesFeedback} entrega{alumno.pendientesFeedback !== 1 ? 's' : ''} sin revisar
            </span>
          )}
          {variant === 'danger' && (
            <span className="text-xs text-slate-400">Nunca ha accedido</span>
          )}
          {variant === 'success' && alumno.ultimaVisita && (
            <span className="text-xs text-slate-400">Último acceso: {formatRelativo(alumno.ultimaVisita)}</span>
          )}
          {variant === 'success' && !alumno.ultimaVisita && (
            <span className="text-xs text-slate-400">Sin visitas registradas</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </a>
  )
}

// ── Vista por alumno ────────────────────────────────────────────
function VistaAlumnos({
  alumnos, filtrados, busqueda, setBusqueda, codigo,
}: {
  alumnos: Alumno[]
  filtrados: Alumno[]
  busqueda: string
  setBusqueda: (v: string) => void
  codigo: string
}) {
  return (
    <>
      {alumnos.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar alumno..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {alumnos.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-slate-400">Este grupo no tiene alumnos aún</p>
        </div>
      )}

      {alumnos.length > 0 && filtrados.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-slate-400 text-sm">No se encontró "{busqueda}"</p>
        </div>
      )}

      {filtrados.map(alumno => (
        <Link
          key={alumno.id}
          href={`/${codigo}/alumno/${alumno.id}`}
          className="card card-hover p-4 flex items-center gap-3 block"
        >
          <Image
            src={avatarUrl(alumno.avatar_id)}
            alt={nombreCompleto(alumno)}
            width={48}
            height={48}
            className="rounded-xl flex-shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="font-semibold text-slate-900">{nombreCompleto(alumno)}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-400">
                <Eye className="w-3.5 h-3.5" /> {alumno.visitas}
              </span>
              <span className={cn('flex items-center gap-1', alumno.entregado > 0 ? 'text-green-600' : 'text-slate-300')}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {alumno.entregado}
              </span>
              {alumno.borrador > 0 && (
                <span className="flex items-center gap-1 text-amber-500">
                  <Clock className="w-3.5 h-3.5" /> {alumno.borrador}
                </span>
              )}
            </div>
            {alumno.ultimaVisita && (
              <p className="text-xs text-slate-400">
                Última actividad: {formatRelativo(alumno.ultimaVisita)}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
        </Link>
      ))}

      {busqueda && filtrados.length > 0 && (
        <p className="text-center text-xs text-slate-400 pb-2">
          {filtrados.length} de {alumnos.length} alumnos
        </p>
      )}
    </>
  )
}

// ── Vista por libro ─────────────────────────────────────────────
function VistaLibros({
  libros, alumnos, entregasMap, codigo,
}: {
  libros: Libro[]
  alumnos: AlumnoBasico[]
  entregasMap: Record<string, { estado: string; fecha?: string }>
  codigo: string
}) {
  const [expandedHoja, setExpandedHoja] = useState<string | null>(null)

  if (libros.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-400 text-sm">No hay libros asignados a este grupo</p>
      </div>
    )
  }

  const totalAlumnos = alumnos.length

  return (
    <div className="space-y-4">
      {libros.map(libro => {
        const todasHojas = libro.bloques.flatMap(b => b.hojas)
        const totalHojas = todasHojas.filter(h => h.tipo !== 'lectura').length
        const totalEntregado = todasHojas
          .filter(h => h.tipo !== 'lectura')
          .reduce((acc, h) => {
            return acc + alumnos.filter(a => entregasMap[`${a.id}:${h.id}`]?.estado === 'entregado').length
          }, 0)

        return (
          <div key={libro.id} className="card overflow-hidden">
            {/* Book header */}
            <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-brand-900 text-sm truncate">{libro.titulo}</p>
                {totalHojas > 0 && (
                  <p className="text-xs text-brand-600 opacity-70">
                    {totalEntregado} de {totalHojas * totalAlumnos} entregas completadas
                  </p>
                )}
              </div>
            </div>

            {/* Hojas */}
            <div className="divide-y divide-slate-50">
              {libro.bloques.map(bloque => (
                <div key={bloque.id}>
                  {/* Bloque label */}
                  {libro.bloques.length > 1 && (
                    <div className="px-4 py-1.5 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{bloque.titulo}</p>
                    </div>
                  )}

                  {bloque.hojas.map(hoja => {
                    const entregados = alumnos.filter(a => entregasMap[`${a.id}:${hoja.id}`]?.estado === 'entregado').length
                    const borradores = alumnos.filter(a => entregasMap[`${a.id}:${hoja.id}`]?.estado === 'borrador').length
                    const pendientes = totalAlumnos - entregados - borradores
                    const isExpanded = expandedHoja === hoja.id
                    const esActividad = hoja.tipo !== 'lectura'

                    return (
                      <div key={hoja.id}>
                        <button
                          type="button"
                          onClick={() => esActividad && setExpandedHoja(isExpanded ? null : hoja.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                            esActividad ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                          )}
                        >
                          {/* Type badge */}
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0', tipoColor[hoja.tipo] ?? 'bg-slate-100 text-slate-500')}>
                            {tipoLabel[hoja.tipo] ?? hoja.tipo}
                          </span>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {hoja.titulo ?? bloque.titulo}
                            </p>
                            {esActividad && (
                              <div className="flex items-center gap-3 mt-1">
                                {/* Progress bar */}
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: totalAlumnos > 0 ? `${(entregados / totalAlumnos) * 100}%` : '0%' }}
                                  />
                                </div>
                                <span className="text-xs text-slate-400 flex-shrink-0">
                                  {entregados}/{totalAlumnos}
                                </span>
                                {borradores > 0 && (
                                  <span className="text-xs text-amber-500 flex-shrink-0">{borradores} borrador</span>
                                )}
                              </div>
                            )}
                          </div>

                          {esActividad && (
                            isExpanded
                              ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                        </button>

                        {/* Expanded student list */}
                        {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-100 divide-y divide-slate-100">
                            {alumnos.map(alumno => {
                              const entrega = entregasMap[`${alumno.id}:${hoja.id}`]
                              const estado = entrega?.estado ?? null

                              return (
                                <Link
                                  key={alumno.id}
                                  href={`/${codigo}/alumno/${alumno.id}`}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white transition-colors"
                                >
                                  <Image
                                    src={avatarUrl(alumno.avatar_id)}
                                    alt={nombreCompleto(alumno)}
                                    width={32}
                                    height={32}
                                    className="rounded-lg flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{nombreCompleto(alumno)}</p>
                                    {entrega?.fecha && estado === 'entregado' && (
                                      <p className="text-xs text-slate-400">{formatFechaHora(entrega.fecha)}</p>
                                    )}
                                  </div>
                                  {estado === 'entregado' ? (
                                    <span className="badge-entregado flex-shrink-0">
                                      <CheckCircle2 className="w-3 h-3" /> Entregado
                                    </span>
                                  ) : estado === 'borrador' ? (
                                    <span className="badge-borrador flex-shrink-0">Borrador</span>
                                  ) : (
                                    <span className="badge-pendiente flex-shrink-0">Pendiente</span>
                                  )}
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
