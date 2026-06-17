'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import {
  ArrowRight, Users, AlertTriangle, Check, ChevronDown, Loader2,
} from 'lucide-react'
import { Toast } from '@/components/ui'
import { nombreCompleto, avatarUrl, cn } from '@/lib/utils'

interface Ciclo { id: string; nombre: string; activo: boolean }
interface Colegio { id: string; nombre: string; codigo: string }
interface Grupo { id: string; nombre: string; ciclo_id: string | null }
interface AlumnoConStats {
  id: string
  nombre: string
  apellido: string
  avatar_id: number
  totalEntregas: number
}

interface Props {
  ciclos: Ciclo[]
  colegios: Colegio[]
}

export default function PromocionClient({ ciclos, colegios }: Props) {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Selección origen
  const [colegioId, setColegioId] = useState('')
  const [cicloOrigenId, setCicloOrigenId] = useState('')
  const [grupoOrigenId, setGrupoOrigenId] = useState('')

  // Selección destino
  const [cicloDestinoId, setCicloDestinoId] = useState('')
  const [grupoDestinoId, setGrupoDestinoId] = useState('')

  // Datos cargados dinámicamente
  const [gruposOrigen, setGruposOrigen] = useState<Grupo[]>([])
  const [gruposDestino, setGruposDestino] = useState<Grupo[]>([])
  const [alumnos, setAlumnos] = useState<AlumnoConStats[]>([])
  const [loadingGruposOrigen, setLoadingGruposOrigen] = useState(false)
  const [loadingGruposDestino, setLoadingGruposDestino] = useState(false)
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)

  // Selección de alumnos a promover
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  const [promoting, setPromoting] = useState(false)
  const [resultado, setResultado] = useState<{ promovidos: number; eliminados: number } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
  }

  async function cargarGruposOrigen(cicloId: string) {
    if (!colegioId || !cicloId) return
    setLoadingGruposOrigen(true)
    setGruposOrigen([])
    setGrupoOrigenId('')
    setAlumnos([])
    setSeleccionados(new Set())
    const res = await fetch(`/api/admin/grupos?colegio_id=${colegioId}&ciclo_id=${cicloId}`)
    const data = await res.json()
    setGruposOrigen(data.grupos ?? [])
    setLoadingGruposOrigen(false)
  }

  async function cargarGruposDestino(cicloId: string) {
    if (!colegioId || !cicloId) return
    setLoadingGruposDestino(true)
    setGruposDestino([])
    setGrupoDestinoId('')
    const res = await fetch(`/api/admin/grupos?colegio_id=${colegioId}&ciclo_id=${cicloId}`)
    const data = await res.json()
    setGruposDestino(data.grupos ?? [])
    setLoadingGruposDestino(false)
  }

  async function cargarAlumnos(grupoId: string) {
    if (!grupoId) return
    setLoadingAlumnos(true)
    setAlumnos([])
    setSeleccionados(new Set())
    const res = await fetch(`/api/admin/grupos/${grupoId}/alumnos-stats`)
    const data = await res.json()
    const lista: AlumnoConStats[] = data.alumnos ?? []
    setAlumnos(lista)
    setSeleccionados(new Set(lista.map(a => a.id)))
    setLoadingAlumnos(false)
  }

  function toggleAlumno(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTodos() {
    if (seleccionados.size === alumnos.length) setSeleccionados(new Set())
    else setSeleccionados(new Set(alumnos.map(a => a.id)))
  }

  const noSeleccionados = alumnos.filter(a => !seleccionados.has(a.id))
  const sinEntregasNoSeleccionados = noSeleccionados.filter(a => a.totalEntregas === 0)

  async function handlePromover() {
    if (!grupoOrigenId || !grupoDestinoId || seleccionados.size === 0) return
    setPromoting(true)

    const res = await fetch('/api/admin/promocion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumnoIds: Array.from(seleccionados),
        sourceGrupoId: grupoOrigenId,
        targetGrupoId: grupoDestinoId,
        eliminarSinEntregas: sinEntregasNoSeleccionados.map(a => a.id),
      }),
    })

    const data = await res.json()
    setPromoting(false)

    if (!res.ok) {
      showToast(data.error ?? 'Error al promover', 'error')
      return
    }

    setResultado({ promovidos: data.promovidos, eliminados: data.eliminados })
    showToast(`${data.promovidos} alumno(s) promovido(s)${data.eliminados > 0 ? `, ${data.eliminados} eliminado(s)` : ''}`)

    // Limpiar selección del grupo origen
    setAlumnos([])
    setSeleccionados(new Set())
  }

  const canPromover = grupoOrigenId && grupoDestinoId && seleccionados.size > 0 && !promoting

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">

        {resultado && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Promoción completada</p>
              <p className="text-sm text-green-700 mt-0.5">
                {resultado.promovidos} alumno(s) movido(s) al nuevo grupo.
                {resultado.eliminados > 0 && ` ${resultado.eliminados} perfil(es) sin entregas eliminado(s).`}
              </p>
              <button
                onClick={() => setResultado(null)}
                className="text-xs text-green-600 mt-1 underline"
              >
                Hacer otra promoción
              </button>
            </div>
          </div>
        )}

        {/* Paso 1: Selección base */}
        <section className="card p-5 space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">1</span>
            Selecciona colegio y ciclo de origen
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Colegio</label>
              <div className="relative">
                <select
                  className="input pr-8 appearance-none"
                  value={colegioId}
                  onChange={e => {
                    setColegioId(e.target.value)
                    setCicloOrigenId('')
                    setGruposOrigen([])
                    setGrupoOrigenId('')
                    setAlumnos([])
                    setSeleccionados(new Set())
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {colegios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ciclo origen</label>
              <div className="relative">
                <select
                  className="input pr-8 appearance-none"
                  value={cicloOrigenId}
                  disabled={!colegioId}
                  onChange={e => {
                    setCicloOrigenId(e.target.value)
                    cargarGruposOrigen(e.target.value)
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' ★' : ''}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Grupo origen</label>
              <div className="relative">
                {loadingGruposOrigen ? (
                  <div className="input flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
                  </div>
                ) : (
                  <select
                    className="input pr-8 appearance-none"
                    value={grupoOrigenId}
                    disabled={!cicloOrigenId || gruposOrigen.length === 0}
                    onChange={e => {
                      setGrupoOrigenId(e.target.value)
                      cargarAlumnos(e.target.value)
                    }}
                  >
                    <option value="">
                      {gruposOrigen.length === 0 && cicloOrigenId ? 'Sin grupos' : 'Seleccionar...'}
                    </option>
                    {gruposOrigen.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                )}
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* Alumnos */}
        {grupoOrigenId && (
          <section className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Selecciona alumnos a promover
              </h2>
              {alumnos.length > 0 && (
                <button
                  onClick={toggleTodos}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  {seleccionados.size === alumnos.length ? 'Desmarcar todos' : 'Seleccionar todos'}
                </button>
              )}
            </div>

            {loadingAlumnos ? (
              <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Cargando alumnos...</span>
              </div>
            ) : alumnos.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Este grupo no tiene alumnos activos.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {alumnos.map(alumno => {
                  const checked = seleccionados.has(alumno.id)
                  return (
                    <button
                      key={alumno.id}
                      onClick={() => toggleAlumno(alumno.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                        checked
                          ? 'border-brand-400 bg-brand-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors',
                        checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300'
                      )}>
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <Image
                        src={avatarUrl(alumno.avatar_id)}
                        alt={nombreCompleto(alumno)}
                        width={36}
                        height={36}
                        className="rounded-xl flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm">{nombreCompleto(alumno)}</p>
                        <p className={cn(
                          'text-xs mt-0.5',
                          alumno.totalEntregas > 0 ? 'text-green-600' : 'text-amber-600'
                        )}>
                          {alumno.totalEntregas > 0
                            ? `${alumno.totalEntregas} entrega(s)`
                            : 'Sin entregas'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {seleccionados.size > 0 && (
              <p className="text-sm text-brand-700 font-semibold">
                {seleccionados.size} alumno(s) seleccionado(s) para promover
              </p>
            )}

            {/* Advertencia alumnos sin entregas no seleccionados */}
            {sinEntregasNoSeleccionados.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {sinEntregasNoSeleccionados.length} alumno(s) sin entregas serán eliminados
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {sinEntregasNoSeleccionados.map(a => nombreCompleto(a)).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Paso 3: Destino */}
        {grupoOrigenId && alumnos.length > 0 && (
          <section className="card p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              Selecciona ciclo y grupo destino
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ciclo destino</label>
                <div className="relative">
                  <select
                    className="input pr-8 appearance-none"
                    value={cicloDestinoId}
                    onChange={e => {
                      setCicloDestinoId(e.target.value)
                      cargarGruposDestino(e.target.value)
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.activo ? ' ★' : ''}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Grupo destino</label>
                <div className="relative">
                  {loadingGruposDestino ? (
                    <div className="input flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
                    </div>
                  ) : (
                    <select
                      className="input pr-8 appearance-none"
                      value={grupoDestinoId}
                      disabled={!cicloDestinoId || gruposDestino.length === 0}
                      onChange={e => setGrupoDestinoId(e.target.value)}
                    >
                      <option value="">
                        {gruposDestino.length === 0 && cicloDestinoId ? 'Sin grupos en este ciclo' : 'Seleccionar...'}
                      </option>
                      {gruposDestino.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </select>
                  )}
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {gruposDestino.length === 0 && cicloDestinoId && !loadingGruposDestino && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                No hay grupos en este ciclo. Crea los grupos del nuevo ciclo desde Gestionar grupos antes de promover.
              </p>
            )}
          </section>
        )}

        {/* Resumen y botón */}
        {canPromover && grupoDestinoId && (
          <section className="card p-5 space-y-4">
            <h2 className="font-bold text-slate-800">Resumen de promoción</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 font-medium">Desde</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {gruposOrigen.find(g => g.id === grupoOrigenId)?.nombre}
                </p>
                <p className="text-xs text-slate-400">{ciclos.find(c => c.id === cicloOrigenId)?.nombre}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-brand-500 flex-shrink-0" />
              <div className="flex-1 bg-brand-50 border border-brand-200 rounded-xl p-3 text-center">
                <p className="text-xs text-brand-600 font-medium">Hacia</p>
                <p className="font-bold text-brand-900 mt-0.5">
                  {gruposDestino.find(g => g.id === grupoDestinoId)?.nombre}
                </p>
                <p className="text-xs text-brand-500">{ciclos.find(c => c.id === cicloDestinoId)?.nombre}</p>
              </div>
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <p>• <span className="font-semibold">{seleccionados.size}</span> alumno(s) serán promovidos</p>
              {noSeleccionados.length > 0 && (
                <p>• <span className="font-semibold">{noSeleccionados.length}</span> alumno(s) se quedan en el grupo origen (historial conservado)</p>
              )}
              {sinEntregasNoSeleccionados.length > 0 && (
                <p className="text-red-600">• <span className="font-semibold">{sinEntregasNoSeleccionados.length}</span> alumno(s) sin entregas serán eliminados permanentemente</p>
              )}
            </div>
            <button
              onClick={handlePromover}
              disabled={promoting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {promoting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Promoviendo...</>
              ) : (
                <><ArrowRight className="w-5 h-5" /> Confirmar y promover {seleccionados.size} alumno(s)</>
              )}
            </button>
          </section>
        )}
      </div>
    </>
  )
}
