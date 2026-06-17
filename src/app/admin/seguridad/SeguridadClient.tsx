'use client'

import { useState } from 'react'
import { Trash2, Plus, ShieldCheck, Eye, EyeOff } from 'lucide-react'

interface AdminPassword {
  id: string
  etiqueta: string
  created_at: string
}

interface Props {
  initialPasswords: AdminPassword[]
  isEmpty: boolean
}

export default function SeguridadClient({ initialPasswords, isEmpty }: Props) {
  const [passwords, setPasswords] = useState<AdminPassword[]>(initialPasswords)
  const [showForm, setShowForm] = useState(false)
  const [etiqueta, setEtiqueta] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function resetForm() {
    setShowForm(false)
    setEtiqueta('')
    setPassword('')
    setConfirmPwd('')
  }

  async function handleAdd() {
    if (!password) return
    if (password !== confirmPwd) { showToast('Las contraseñas no coinciden', 'error'); return }
    if (password.length < 6) { showToast('Mínimo 6 caracteres', 'error'); return }
    setLoading(true)
    const res = await fetch('/api/admin/passwords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etiqueta: etiqueta.trim() || 'Sin nombre', password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { showToast(data.error ?? 'Error al guardar', 'error'); return }
    setPasswords(prev => [...prev, data.password])
    resetForm()
    showToast('Contraseña agregada', 'success')
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta contraseña?')) return
    const res = await fetch(`/api/admin/passwords/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { showToast(data.error ?? 'Error', 'error'); return }
    setPasswords(prev => prev.filter(p => p.id !== id))
    showToast('Contraseña eliminada', 'success')
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {isEmpty && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Sin contraseñas en la base de datos</p>
          <p>El acceso usa la contraseña de entorno como respaldo. Agrega tu contraseña actual aquí para gestionarla desde el panel.</p>
        </div>
      )}

      {/* List */}
      <section className="space-y-2">
        {passwords.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No hay contraseñas registradas</p>
        ) : (
          passwords.map(p => (
            <div key={p.id} className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{p.etiqueta}</p>
                <p className="text-xs text-slate-400">
                  Agregada {new Date(p.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                disabled={passwords.length <= 1}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={passwords.length <= 1 ? 'No puedes eliminar la única contraseña' : 'Eliminar'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </section>

      {/* Add form */}
      {showForm ? (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">Nueva contraseña</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Nombre (opcional)</label>
              <input
                type="text"
                value={etiqueta}
                onChange={e => setEtiqueta(e.target.value)}
                placeholder="ej. Principal, Backup..."
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Confirmar contraseña</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                className="input"
                placeholder="Repite la contraseña"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={loading || !password} className="btn-primary flex-1">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={resetForm} className="btn-secondary flex-1">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="card card-hover p-4 flex items-center gap-3 w-full text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center">
            <Plus className="w-4 h-4 text-brand-600" />
          </div>
          <span className="font-medium text-slate-700">Agregar contraseña</span>
        </button>
      )}
    </div>
  )
}
