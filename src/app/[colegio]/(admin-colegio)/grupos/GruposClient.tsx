'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Users, BookOpen, Plus, Trash2, Pencil, Search,
  X, Check, UserMinus, UserPlus, ChevronRight,
  AlertCircle, UserX,
} from 'lucide-react'
import { Modal, Confirm, Toast } from '@/components/ui'
import { nombreCompleto, avatarUrl, cn } from '@/lib/utils'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────
interface Catequista { id: string; nombre: string; apellido: string; avatar_id?: number }
interface Libro { id: string; titulo: string; portada_url?: string }
interface Alumno {
  id: string
  nombre: string
  apellido: string
  avatar_id: number
  activo: boolean
  grupo_alumnos?: { grupo_id: string; grupo: { id: string; nombre: string } | null }[]
}
interface Grupo {
  id: string
  nombre: string
  activo: boolean
  catequista: Catequista | null
  grupo_alumnos: { alumno_id: string }[]
}

interface Props {
  grupos: Grupo[]
  catequistas: Catequista[]
  libros: Libro[]
  alumnos: Alumno[]
  libroCountMap: Record<string, number>
  colegioId: string
  codigoColegio: string
}

// ── Color palette for groups ──────────────────────────────────
const PALETTES = [
  { light: 'bg-violet-100', dark: 'bg-violet-600', text: 'text-violet-700', border: 'border-violet-300' },
  { light: 'bg-brand-100', dark: 'bg-brand-600', text: 'text-brand-700', border: 'border-brand-300' },
  { light: 'bg-emerald-100', dark: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-300' },
  { light: 'bg-amber-100', dark: 'bg-amber-600', text: 'text-amber-700', border: 'border-amber-300' },
  { light: 'bg-rose-100', dark: 'bg-rose-600', text: 'text-rose-700', border: 'border-rose-300' },
  { light: 'bg-cyan-100', dark: 'bg-cyan-600', text: 'text-cyan-700', border: 'border-cyan-300' },
]

function paletteFor(index: number) {
  return PALETTES[index % PALETTES.length]
}

// ── Main component ────────────────────────────────────────────
export default function GruposClient({
  grupos: initialGrupos,
  catequistas,
  libros,
  alumnos: initialAlumnos,
  libroCountMap: initialLibroCountMap,
  colegioId,
  codigoColegio,
}: Props) {
  const [grupos, setGrupos] = useState(initialGrupos)
  const [alumnos, setAlumnos] = useState(initialAlumnos)
  const [libroCountMap, setLibroCountMap] = useState(initialLibroCountMap)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Modal states
  const [creandoGrupo, setCreandoGrupo] = useState(false)
  const [editandoGrupo, setEditandoGrupo] = useState<Grupo | null>(null)
  const [gestionandoAlumnos, setGestionandoAlumnos] = useState<{ grupo: Grupo; idx: number } | null>(null)
  const [asignandoLibros, setAsignandoLibros] = useState<{ grupo: Grupo; librosIds: string[] } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Grupo | null>(null)
  const [deleteError, setDeleteError] = useState<{ msg: string; grupo: Grupo } | null>(null)
  const [loadingLibros, setLoadingLibros] = useState(false)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
  }

  // ── Libro assignment ────────────────────────────────────────
  async function openLibros(grupo: Grupo) {
    setLoadingLibros(true)
    const res = await fetch(`/api/colegio/libro-grupos?grupo_id=${grupo.id}`)
    const data = await res.json()
    setAsignandoLibros({ grupo, librosIds: data.libros ?? [] })
    setLoadingLibros(false)
  }

  async function handleToggleLibro(libroId: string) {
    if (!asignandoLibros) return
    const isAssigned = asignandoLibros.librosIds.includes(libroId)
    const res = await fetch('/api/colegio/libro-grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grupo_id: asignandoLibros.grupo.id, libro_id: libroId, activo: !isAssigned }),
    })
    if (!res.ok) { showToast('Error al actualizar', 'error'); return }
    const newIds = isAssigned
      ? asignandoLibros.librosIds.filter(id => id !== libroId)
      : [...asignandoLibros.librosIds, libroId]
    setAsignandoLibros(p => p ? { ...p, librosIds: newIds } : null)
    setLibroCountMap(prev => ({
      ...prev,
      [asignandoLibros.grupo.id]: newIds.length,
    }))
  }

  // ── Group CRUD ───────────────────────────────────────────────
  function handleGrupoCreado(nuevoGrupo: Grupo) {
    setGrupos(prev => [...prev, { ...nuevoGrupo, grupo_alumnos: [] }])
    setCreandoGrupo(false)
    showToast('Grupo creado correctamente')
    // Ofrecer gestionar alumnos del nuevo grupo
    const idx = grupos.length
    setTimeout(() => setGestionandoAlumnos({ grupo: { ...nuevoGrupo, grupo_alumnos: [] }, idx }), 300)
  }

  function handleGrupoEditado(grupoActualizado: Grupo) {
    setGrupos(prev => prev.map(g => g.id === grupoActualizado.id
      ? { ...g, nombre: grupoActualizado.nombre, catequista: grupoActualizado.catequista }
      : g
    ))
    setEditandoGrupo(null)
    showToast('Grupo actualizado')
  }

  async function handleDeleteGrupo(grupo: Grupo) {
    const res = await fetch(`/api/colegio/grupos/${grupo.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setGrupos(prev => prev.filter(g => g.id !== grupo.id))
      showToast('Grupo eliminado')
    } else if (res.status === 409) {
      setDeleteError({ msg: data.error, grupo })
    } else {
      showToast(data.error ?? 'Error al eliminar', 'error')
    }
    setDeleteConfirm(null)
  }

  async function handleDeactivateGrupo(grupo: Grupo) {
    const res = await fetch(`/api/colegio/grupos`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: grupo.id }),
    })
    if (res.ok) {
      setGrupos(prev => prev.map(g => g.id === grupo.id ? { ...g, activo: false } : g))
      showToast('Grupo desactivado')
    } else {
      showToast('Error al desactivar', 'error')
    }
    setDeleteError(null)
  }

  // ── Alumnos management ───────────────────────────────────────
  function getAlumnosDelGrupo(grupoId: string) {
    return alumnos.filter(a =>
      a.grupo_alumnos?.some(ga => ga.grupo_id === grupoId)
    )
  }

  function getAlumnosDisponibles(grupoId: string) {
    return alumnos.filter(a =>
      !a.grupo_alumnos?.some(ga => ga.grupo_id === grupoId) && a.activo
    )
  }

  function handleAlumnoAgregado(grupoId: string, alumnoId: string) {
    setAlumnos(prev => prev.map(a => {
      if (a.id !== alumnoId) return a
      const grupoObj = grupos.find(g => g.id === grupoId)
      return {
        ...a,
        grupo_alumnos: [{ grupo_id: grupoId, grupo: grupoObj ? { id: grupoId, nombre: grupoObj.nombre } : null }],
      }
    }))
    setGrupos(prev => prev.map(g => {
      if (g.id === grupoId) {
        return { ...g, grupo_alumnos: [...g.grupo_alumnos, { alumno_id: alumnoId }] }
      }
      // Si el alumno estaba en este otro grupo, quitarlo
      const wasHere = alumnos.find(a => a.id === alumnoId)?.grupo_alumnos?.some(ga => ga.grupo_id === g.id)
      if (wasHere) {
        return { ...g, grupo_alumnos: g.grupo_alumnos.filter(ga => ga.alumno_id !== alumnoId) }
      }
      return g
    }))
  }

  function handleAlumnoQuitado(grupoId: string, alumnoId: string) {
    setAlumnos(prev => prev.map(a =>
      a.id === alumnoId ? { ...a, grupo_alumnos: [] } : a
    ))
    setGrupos(prev => prev.map(g => {
      if (g.id !== grupoId) return g
      return { ...g, grupo_alumnos: g.grupo_alumnos.filter(ga => ga.alumno_id !== alumnoId) }
    }))
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Confirm delete */}
      {deleteConfirm && (
        <Confirm
          open
          title="Eliminar grupo"
          message={`¿Eliminar el grupo "${deleteConfirm.nombre}"? Los alumnos no se eliminarán pero quedarán sin grupo.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={() => handleDeleteGrupo(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Delete error (has alumnos) */}
      {deleteError && (
        <Modal open onClose={() => setDeleteError(null)} title="No se puede eliminar" size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{deleteError.msg}</p>
            </div>
            <p className="text-sm text-slate-600">
              Puedes desactivar el grupo para que no sea visible, sin perder los datos.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteError(null)} className="btn-ghost flex-1">Cancelar</button>
              <button
                onClick={() => handleDeactivateGrupo(deleteError.grupo)}
                className="btn-danger flex-1 flex items-center justify-center gap-2"
              >
                <UserX className="w-4 h-4" /> Desactivar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create group modal */}
      {creandoGrupo && (
        <CrearGrupoModal
          catequistas={catequistas}
          colegioId={colegioId}
          onClose={() => setCreandoGrupo(false)}
          onCreado={handleGrupoCreado}
        />
      )}

      {/* Edit group modal */}
      {editandoGrupo && (
        <EditarGrupoModal
          grupo={editandoGrupo}
          catequistas={catequistas}
          onClose={() => setEditandoGrupo(null)}
          onEditado={handleGrupoEditado}
        />
      )}

      {/* Manage alumnos modal */}
      {gestionandoAlumnos && (
        <GestionarAlumnosModal
          grupo={gestionandoAlumnos.grupo}
          paletteIndex={gestionandoAlumnos.idx}
          alumnosDelGrupo={getAlumnosDelGrupo(gestionandoAlumnos.grupo.id)}
          alumnosDisponibles={getAlumnosDisponibles(gestionandoAlumnos.grupo.id)}
          onClose={() => setGestionandoAlumnos(null)}
          onAgregado={(alumnoId) => handleAlumnoAgregado(gestionandoAlumnos.grupo.id, alumnoId)}
          onQuitado={(alumnoId) => handleAlumnoQuitado(gestionandoAlumnos.grupo.id, alumnoId)}
          onToast={showToast}
        />
      )}

      {/* Assign libros modal */}
      {asignandoLibros && (
        <AsignarLibrosModal
          grupo={asignandoLibros.grupo}
          libros={libros}
          librosIds={asignandoLibros.librosIds}
          loading={loadingLibros}
          onToggle={handleToggleLibro}
          onClose={() => setAsignandoLibros(null)}
        />
      )}

      {/* Main content */}
      <div className="px-4 pt-4 space-y-3 pb-6">
        {/* New group button */}
        <button
          onClick={() => setCreandoGrupo(true)}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          <Plus className="w-5 h-5" />
          Crear nuevo grupo
        </button>

        {/* Empty state */}
        {grupos.length === 0 && (
          <div className="card p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-600">Aún no hay grupos</p>
              <p className="text-sm text-slate-400 mt-1">
                Crea el primer grupo y asígnale un catequista y alumnos.
              </p>
            </div>
          </div>
        )}

        {/* Group cards */}
        {grupos.map((grupo, idx) => {
          const palette = paletteFor(idx)
          const alumnoCount = grupo.grupo_alumnos?.length ?? 0
          const libroCount = libroCountMap[grupo.id] ?? 0

          return (
            <div
              key={grupo.id}
              className={cn('card overflow-hidden', !grupo.activo && 'opacity-60')}
            >
              {/* Color accent stripe */}
              <div className={`h-1.5 ${palette.dark}`} />

              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl ${palette.light} flex items-center justify-center flex-shrink-0`}>
                    <Users className={`w-5 h-5 ${palette.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-base leading-tight">{grupo.nombre}</p>
                    {grupo.catequista ? (
                      <p className="text-sm text-slate-500 mt-0.5">{nombreCompleto(grupo.catequista)}</p>
                    ) : (
                      <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        Sin catequista
                      </span>
                    )}
                  </div>

                  {/* Edit + Delete */}
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => setEditandoGrupo(grupo)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
                      title="Editar grupo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(grupo)}
                      className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Eliminar grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                    alumnoCount > 0 ? `${palette.light} ${palette.text}` : 'bg-slate-100 text-slate-400'
                  )}>
                    <Users className="w-3.5 h-3.5" />
                    {alumnoCount} {alumnoCount === 1 ? 'alumno' : 'alumnos'}
                  </span>
                  <span className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                    libroCount > 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
                  )}>
                    <BookOpen className="w-3.5 h-3.5" />
                    {libroCount} {libroCount === 1 ? 'libro' : 'libros'}
                  </span>
                  {!grupo.activo && (
                    <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-full text-xs font-semibold">
                      Inactivo
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setGestionandoAlumnos({ grupo, idx })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors border border-slate-200"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Alumnos
                  </button>
                  <button
                    onClick={() => openLibros(grupo)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors border border-slate-200"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Libros
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Crear grupo modal ─────────────────────────────────────────
function CrearGrupoModal({
  catequistas,
  colegioId,
  onClose,
  onCreado,
}: {
  catequistas: Catequista[]
  colegioId: string
  onClose: () => void
  onCreado: (grupo: Grupo) => void
}) {
  const [nombre, setNombre] = useState('')
  const [catequistaId, setCatequistaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleCreate() {
    if (!nombre.trim()) { setError('El nombre del grupo es requerido'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/colegio/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), catequista_id: catequistaId || null }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onCreado(data.grupo)
  }

  return (
    <Modal open onClose={onClose} title="Nuevo grupo">
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Nombre del grupo *</label>
          <input
            ref={inputRef}
            className="input"
            placeholder="Ej: Confirmación A, Primer año..."
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Catequista responsable</label>
          {catequistas.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              No hay catequistas registrados. Puedes asignar uno después.
            </div>
          ) : (
            <select
              className="input"
              value={catequistaId}
              onChange={e => setCatequistaId(e.target.value)}
            >
              <option value="">Sin asignar (asignar después)</option>
              {catequistas.map(c => (
                <option key={c.id} value={c.id}>{nombreCompleto(c)}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button
            onClick={handleCreate}
            disabled={loading || !nombre.trim()}
            className="btn-primary flex-1"
          >
            {loading ? 'Creando...' : 'Crear grupo'}
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Después de crear podrás agregar alumnos al grupo
        </p>
      </div>
    </Modal>
  )
}

// ── Editar grupo modal ────────────────────────────────────────
function EditarGrupoModal({
  grupo,
  catequistas,
  onClose,
  onEditado,
}: {
  grupo: Grupo
  catequistas: Catequista[]
  onClose: () => void
  onEditado: (g: Grupo) => void
}) {
  const [nombre, setNombre] = useState(grupo.nombre)
  const [catequistaId, setCatequistaId] = useState(grupo.catequista?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setLoading(true); setError('')
    const res = await fetch(`/api/colegio/grupos/${grupo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), catequista_id: catequistaId || null }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onEditado(data.grupo)
  }

  return (
    <Modal open onClose={onClose} title="Editar grupo">
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Nombre del grupo *</label>
          <input
            className="input"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">Catequista responsable</label>
          <select
            className="input"
            value={catequistaId}
            onChange={e => setCatequistaId(e.target.value)}
          >
            <option value="">Sin catequista asignado</option>
            {catequistas.map(c => (
              <option key={c.id} value={c.id}>{nombreCompleto(c)}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={loading || !nombre.trim()} className="btn-primary flex-1">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Gestionar alumnos modal ───────────────────────────────────
function GestionarAlumnosModal({
  grupo,
  paletteIndex,
  alumnosDelGrupo,
  alumnosDisponibles,
  onClose,
  onAgregado,
  onQuitado,
  onToast,
}: {
  grupo: Grupo
  paletteIndex: number
  alumnosDelGrupo: Alumno[]
  alumnosDisponibles: Alumno[]
  onClose: () => void
  onAgregado: (alumnoId: string) => void
  onQuitado: (alumnoId: string) => void
  onToast: (msg: string, type?: 'success' | 'error') => void
}) {
  const palette = paletteFor(paletteIndex)
  const [busqueda, setBusqueda] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmMover, setConfirmMover] = useState<Alumno | null>(null)

  const disponiblesFiltrados = useMemo(() => {
    if (!busqueda) return alumnosDisponibles
    const q = busqueda.toLowerCase()
    return alumnosDisponibles.filter(a =>
      a.nombre.toLowerCase().includes(q) || a.apellido.toLowerCase().includes(q)
    )
  }, [busqueda, alumnosDisponibles])

  async function handleAgregar(alumno: Alumno, confirmado = false) {
    // Si el alumno está en otro grupo, pedir confirmación
    const grupoActual = alumno.grupo_alumnos?.[0]?.grupo
    if (grupoActual && !confirmado) {
      setConfirmMover(alumno)
      return
    }

    setLoadingId(alumno.id)
    const res = await fetch(`/api/colegio/grupos/${grupo.id}/alumnos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumnoId: alumno.id }),
    })
    const data = await res.json()
    setLoadingId(null)
    setConfirmMover(null)
    if (!res.ok) { onToast(data.error ?? 'Error al agregar alumno', 'error'); return }
    onAgregado(alumno.id)
    onToast(`${nombreCompleto(alumno)} agregado al grupo`)
  }

  async function handleQuitar(alumno: Alumno) {
    setLoadingId(alumno.id)
    const res = await fetch(`/api/colegio/grupos/${grupo.id}/alumnos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumnoId: alumno.id }),
    })
    setLoadingId(null)
    if (!res.ok) { onToast('Error al quitar alumno', 'error'); return }
    onQuitado(alumno.id)
    onToast(`${nombreCompleto(alumno)} quitado del grupo`)
  }

  return (
    <>
      {confirmMover && (
        <Confirm
          open
          title="Cambiar de grupo"
          message={`${nombreCompleto(confirmMover)} ya está en "${confirmMover.grupo_alumnos?.[0]?.grupo?.nombre}". ¿Moverlo a ${grupo.nombre}?`}
          confirmLabel="Mover"
          onConfirm={() => handleAgregar(confirmMover, true)}
          onCancel={() => setConfirmMover(null)}
        />
      )}

      <Modal open onClose={onClose} title={`Alumnos — ${grupo.nombre}`} size="lg">
        <div className="space-y-5 -mx-1">
          {/* Current alumnos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-slate-700">
                En este grupo
                {alumnosDelGrupo.length > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${palette.light} ${palette.text}`}>
                    {alumnosDelGrupo.length}
                  </span>
                )}
              </h3>
            </div>

            {alumnosDelGrupo.length === 0 ? (
              <div className="px-3 py-6 text-center bg-slate-50 rounded-2xl">
                <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Este grupo no tiene alumnos.</p>
                <p className="text-xs text-slate-400">Agrégalos desde la lista de abajo.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {alumnosDelGrupo.map(alumno => (
                  <div key={alumno.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl">
                    <Image
                      src={avatarUrl(alumno.avatar_id)}
                      alt={nombreCompleto(alumno)}
                      width={36}
                      height={36}
                      className="rounded-xl flex-shrink-0"
                    />
                    <span className="flex-1 text-sm font-medium text-slate-800">{nombreCompleto(alumno)}</span>
                    <button
                      onClick={() => handleQuitar(alumno)}
                      disabled={loadingId === alumno.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      {loadingId === alumno.id ? '...' : 'Quitar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-slate-400 font-medium">Agregar alumno</span>
            </div>
          </div>

          {/* Available alumnos */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-10 text-sm"
                placeholder="Buscar alumno por nombre..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>

            {disponiblesFiltrados.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <p className="text-sm text-slate-400">
                  {busqueda ? 'No se encontró ese alumno.' : 'Todos los alumnos ya están en este grupo o no hay alumnos disponibles.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {disponiblesFiltrados.map(alumno => {
                  const grupoActual = alumno.grupo_alumnos?.[0]?.grupo
                  return (
                    <div key={alumno.id} className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl hover:border-brand-200 hover:bg-brand-50/30 transition-colors">
                      <Image
                        src={avatarUrl(alumno.avatar_id)}
                        alt={nombreCompleto(alumno)}
                        width={36}
                        height={36}
                        className="rounded-xl flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{nombreCompleto(alumno)}</p>
                        {grupoActual ? (
                          <p className="text-xs text-amber-600">En: {grupoActual.nombre}</p>
                        ) : (
                          <p className="text-xs text-slate-400">Sin grupo</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAgregar(alumno)}
                        disabled={loadingId === alumno.id}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl font-semibold transition-colors disabled:opacity-50',
                          grupoActual
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                        )}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {loadingId === alumno.id ? '...' : grupoActual ? 'Mover' : 'Agregar'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <button onClick={onClose} className="btn-primary w-full">Listo</button>
        </div>
      </Modal>
    </>
  )
}

// ── Asignar libros modal ──────────────────────────────────────
function AsignarLibrosModal({
  grupo,
  libros,
  librosIds,
  loading,
  onToggle,
  onClose,
}: {
  grupo: Grupo
  libros: Libro[]
  librosIds: string[]
  loading: boolean
  onToggle: (libroId: string) => void
  onClose: () => void
}) {
  const asignados = librosIds.length

  return (
    <Modal open onClose={onClose} title={`Libros — ${grupo.nombre}`}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Selecciona los libros que verán los alumnos de este grupo.
          {asignados > 0 && (
            <span className="ml-1 font-semibold text-brand-600">{asignados} asignado{asignados !== 1 ? 's' : ''}.</span>
          )}
        </p>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Cargando libros...</div>
        ) : libros.length === 0 ? (
          <div className="py-8 text-center">
            <BookOpen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No hay libros disponibles aún.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {libros.map(libro => {
              const assigned = librosIds.includes(libro.id)
              return (
                <button
                  key={libro.id}
                  onClick={() => onToggle(libro.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    assigned
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50'
                  )}
                >
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                    assigned ? 'bg-brand-600' : 'bg-slate-100'
                  )}>
                    {assigned
                      ? <Check className="w-4 h-4 text-white" />
                      : <BookOpen className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className={cn('font-semibold text-sm', assigned ? 'text-brand-900' : 'text-slate-700')}>
                      {libro.titulo}
                    </p>
                  </div>
                  {assigned && (
                    <span className="text-xs text-brand-600 font-semibold">Asignado</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <button onClick={onClose} className="btn-primary w-full mt-2">Listo</button>
      </div>
    </Modal>
  )
}
