'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Pencil, Trash2, Check, Power, AlertCircle } from 'lucide-react'
import { Modal, Confirm, Toast } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Ciclo {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  orden: number
  created_at: string
}

interface Props {
  initialCiclos: Ciclo[]
}

export default function CiclosClient({ initialCiclos }: Props) {
  const [ciclos, setCiclos] = useState<Ciclo[]>(initialCiclos)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Fetch fresh data on mount to avoid stale Router Cache
  useEffect(() => {
    fetch('/api/admin/ciclos')
      .then(r => r.json())
      .then(data => { if (data.ciclos) setCiclos(data.ciclos) })
      .catch(() => {})
  }, [])
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Ciclo | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Ciclo | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
  }

  async function handleToggleActivo(ciclo: Ciclo) {
    const nuevoActivo = !ciclo.activo
    const res = await fetch(`/api/admin/ciclos/${ciclo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: nuevoActivo }),
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error ?? 'Error', 'error'); return }

    setCiclos(prev => prev.map(c => {
      if (c.id === ciclo.id) return data.ciclo
      // Solo un activo a la vez: desactiva los demás si activamos este
      if (nuevoActivo && c.activo) return { ...c, activo: false }
      return c
    }))

    showToast(nuevoActivo ? `"${ciclo.nombre}" es ahora el ciclo activo` : `"${ciclo.nombre}" desactivado`)
  }

  function handleCreado(nuevo: Ciclo) {
    setCiclos(prev => [nuevo, ...prev])
    setCreando(false)
    showToast(`Ciclo "${nuevo.nombre}" creado`)
  }

  function handleEditado(actualizado: Ciclo) {
    setCiclos(prev => prev.map(c => c.id === actualizado.id ? actualizado : c))
    setEditando(null)
    showToast('Ciclo actualizado')
  }

  async function handleDelete(ciclo: Ciclo) {
    const res = await fetch(`/api/admin/ciclos/${ciclo.id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeleteConfirm(null)
    if (!res.ok) {
      setDeleteError(data.error ?? 'Error al eliminar')
      return
    }
    setCiclos(prev => prev.filter(c => c.id !== ciclo.id))
    showToast(`Ciclo "${ciclo.nombre}" eliminado`)
  }

  const activo = ciclos.find(c => c.activo)

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {deleteConfirm && (
        <Confirm
          open
          title="Eliminar ciclo"
          message={`¿Eliminar el ciclo "${deleteConfirm.nombre}"? Solo es posible si no tiene grupos asignados.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {deleteError && (
        <Modal open onClose={() => setDeleteError(null)} title="No se puede eliminar" size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{deleteError}</p>
            </div>
            <button onClick={() => setDeleteError(null)} className="btn-primary w-full">Entendido</button>
          </div>
        </Modal>
      )}

      {creando && (
        <CicloFormModal
          onClose={() => setCreando(false)}
          onGuardado={handleCreado}
        />
      )}

      {editando && (
        <CicloFormModal
          ciclo={editando}
          onClose={() => setEditando(null)}
          onGuardado={handleEditado}
        />
      )}

      <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">

        {/* Ciclo activo banner */}
        {activo ? (
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-brand-600 font-semibold uppercase tracking-wide">Ciclo activo</p>
              <p className="font-bold text-brand-900">{activo.nombre}</p>
              {activo.descripcion && <p className="text-xs text-brand-600 mt-0.5">{activo.descripcion}</p>}
            </div>
            <span className="px-2.5 py-1 bg-brand-600 text-white text-xs font-bold rounded-full">ACTIVO</span>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            <p className="font-semibold">Sin ciclo activo</p>
            <p className="mt-0.5 text-amber-700">Activa un ciclo para que los grupos queden asociados al año catequético actual.</p>
          </div>
        )}

        {/* Botón crear */}
        <button
          onClick={() => setCreando(true)}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          <Plus className="w-5 h-5" />
          Nuevo ciclo catequético
        </button>

        {/* Lista */}
        {ciclos.length === 0 ? (
          <div className="card p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <CalendarDays className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-600">Sin ciclos registrados</p>
              <p className="text-sm text-slate-400 mt-1">Crea el primer ciclo catequético para organizar los grupos por año.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {ciclos.map(ciclo => (
              <div
                key={ciclo.id}
                className={cn(
                  'card p-4 flex items-center gap-4 transition-all',
                  ciclo.activo && 'ring-2 ring-brand-400 ring-offset-2'
                )}
              >
                <div className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                  ciclo.activo ? 'bg-brand-600' : 'bg-slate-100'
                )}>
                  <CalendarDays className={cn('w-5 h-5', ciclo.activo ? 'text-white' : 'text-slate-400')} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 truncate">{ciclo.nombre}</p>
                    {ciclo.activo && (
                      <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-bold rounded-full flex-shrink-0">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  {ciclo.descripcion && (
                    <p className="text-sm text-slate-500 truncate mt-0.5">{ciclo.descripcion}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    Creado {new Date(ciclo.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActivo(ciclo)}
                    title={ciclo.activo ? 'Desactivar ciclo' : 'Activar como ciclo actual'}
                    className={cn(
                      'p-2 rounded-xl transition-colors',
                      ciclo.activo
                        ? 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                        : 'hover:bg-slate-100 text-slate-400 hover:text-brand-600'
                    )}
                  >
                    {ciclo.activo ? <Check className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditando(ciclo)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(ciclo)}
                    disabled={ciclo.activo}
                    className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={ciclo.activo ? 'No puedes eliminar el ciclo activo' : 'Eliminar ciclo'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function CicloFormModal({
  ciclo,
  onClose,
  onGuardado,
}: {
  ciclo?: Ciclo
  onClose: () => void
  onGuardado: (c: Ciclo) => void
}) {
  const [nombre, setNombre] = useState(ciclo?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(ciclo?.descripcion ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setLoading(true); setError('')

    const url = ciclo ? `/api/admin/ciclos/${ciclo.id}` : '/api/admin/ciclos'
    const method = ciclo ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), descripcion: descripcion.trim() || null }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
    onGuardado(data.ciclo)
  }

  return (
    <Modal open onClose={onClose} title={ciclo ? 'Editar ciclo' : 'Nuevo ciclo catequético'}>
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Nombre del ciclo *</label>
          <input
            className="input"
            placeholder="Ej: 2024-2025, Año A..."
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Descripción <span className="text-slate-400 font-normal">(opcional)</span></label>
          <input
            className="input"
            placeholder="Ej: Ciclo de confirmación..."
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={loading || !nombre.trim()} className="btn-primary flex-1">
            {loading ? 'Guardando...' : ciclo ? 'Guardar' : 'Crear ciclo'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
