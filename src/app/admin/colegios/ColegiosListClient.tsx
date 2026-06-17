'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, Link as LinkIcon, Pencil, Trash2, UserX, LayoutList } from 'lucide-react'
import Link from 'next/link'
import { Modal, Toast, Confirm } from '@/components/ui'

interface Colegio {
  id: string
  codigo: string
  nombre: string
  activo: boolean
  created_at: string
}

interface Props {
  colegios: Colegio[]
  countMap: Record<string, { alumnos: number; catequistas: number }>
}

export default function ColegiosListClient({ colegios: initial, countMap }: Props) {
  const [colegios, setColegios] = useState(initial)
  useEffect(() => { setColegios(initial) }, [initial])
  const [editing, setEditing] = useState<Colegio | null>(null)
  const [form, setForm] = useState({ nombre: '', activo: true })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Colegio | null>(null)
  const [deleteError, setDeleteError] = useState<{ msg: string; colegio: Colegio } | null>(null)

  function openEdit(c: Colegio) {
    setEditing(c)
    setForm({ nombre: c.nombre, activo: c.activo })
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/admin/colegios/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.error) {
      setToast({ msg: data.error, type: 'error' })
    } else {
      setColegios(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c))
      setToast({ msg: 'Colegio actualizado', type: 'success' })
      setEditing(null)
    }
    setSaving(false)
  }

  async function handleDelete(colegio: Colegio) {
    const res = await fetch(`/api/admin/colegios/${colegio.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setColegios(prev => prev.filter(c => c.id !== colegio.id))
      setToast({ msg: 'Colegio eliminado', type: 'success' })
    } else if (res.status === 409) {
      setDeleteError({ msg: data.error, colegio })
    } else {
      setToast({ msg: data.error ?? 'Error al eliminar', type: 'error' })
    }
    setConfirmDelete(null)
  }

  async function handleDeactivate(colegio: Colegio) {
    const res = await fetch(`/api/admin/colegios/${colegio.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: false }),
    })
    if (res.ok) {
      setColegios(prev => prev.map(c => c.id === colegio.id ? { ...c, activo: false } : c))
      setToast({ msg: 'Colegio desactivado', type: 'success' })
    } else {
      setToast({ msg: 'Error al desactivar', type: 'error' })
    }
    setDeleteError(null)
  }

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Confirm delete */}
      {confirmDelete && (
        <Confirm
          open
          title="Eliminar colegio"
          message={`¿Eliminar "${confirmDelete.nombre}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Delete error (has related data) */}
      {deleteError && (
        <Modal open onClose={() => setDeleteError(null)} title="No se puede eliminar" size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              {deleteError.msg}
            </div>
            <p className="text-sm text-slate-600">Puedes desactivar el colegio para que no aparezca en la plataforma.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteError(null)} className="btn-ghost flex-1">Cancelar</button>
              <button
                onClick={() => handleDeactivate(deleteError.colegio)}
                className="btn-danger flex-1 flex items-center justify-center gap-2"
              >
                <UserX className="w-4 h-4" /> Desactivar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar colegio">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Nombre</label>
            <input
              className="input"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 flex-1">Estado</label>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                form.activo
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {form.activo ? 'Activo' : 'Inactivo'}
            </button>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-2 text-xs text-slate-400 font-mono">
            Código: {editing?.codigo}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form.nombre.trim()}
            className="btn-primary w-full"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </Modal>

      <div className="space-y-3">
        {colegios.length === 0 && (
          <p className="text-center text-slate-400 py-8">No hay colegios aún. Crea el primero arriba.</p>
        )}
        {colegios.map(colegio => {
          const counts = countMap[colegio.id] ?? { alumnos: 0, catequistas: 0 }
          return (
            <div key={colegio.id} className={`card p-4 space-y-3 ${!colegio.activo ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{colegio.nombre}</p>
                  <p className="text-xs text-slate-400 font-mono">Código: {colegio.codigo}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`badge ${colegio.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {colegio.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={() => openEdit(colegio)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(colegio)}
                    className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 border-t border-slate-50 pt-2 flex-wrap">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {counts.alumnos} alumnos</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {counts.catequistas} catequistas</span>
                <Link
                  href={`/admin/grupos?colegio=${colegio.id}`}
                  className="flex items-center gap-1 text-violet-600 hover:underline font-medium"
                >
                  <LayoutList className="w-3 h-3" /> Grupos
                </Link>
                <a
                  href={`/${colegio.codigo}/login`}
                  target="_blank"
                  className="flex items-center gap-1 text-brand-600 hover:underline ml-auto"
                >
                  <LinkIcon className="w-3 h-3" /> Link de acceso
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
