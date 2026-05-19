'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Colegio { id: string; nombre: string }

export default function NuevoAdminForm({ colegios }: { colegios: Colegio[] }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', colegioId: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ email: string; password: string } | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleCreate() {
    if (!form.nombre || !form.apellido || !form.email || !form.colegioId) {
      setError('Todos los campos son requeridos')
      return
    }
    setLoading(true); setError('')
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rol: 'admin_colegio' }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setResult({ email: form.email, password: data.password })
    setLoading(false)
  }

  if (result) {
    return (
      <div className="card p-6 space-y-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 mx-auto flex items-center justify-center text-3xl">✓</div>
        <h2 className="text-xl font-bold">¡Administrador creado!</h2>
        <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm">
          <p><span className="text-slate-400">Correo:</span> <strong>{result.email}</strong></p>
          <p><span className="text-slate-400">Contraseña temporal:</span> <strong className="font-mono">{result.password}</strong></p>
        </div>
        <button onClick={() => router.push('/admin/usuarios')} className="btn-primary w-full">
          Volver a usuarios
        </button>
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
      {[
        { key: 'nombre', label: 'Nombre', placeholder: 'Ana' },
        { key: 'apellido', label: 'Apellido', placeholder: 'García' },
        { key: 'email', label: 'Correo', placeholder: 'admin@colegio.com', type: 'email' },
      ].map(f => (
        <div key={f.key} className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">{f.label} *</label>
          <input
            className="input"
            type={f.type ?? 'text'}
            placeholder={f.placeholder}
            value={(form as any)[f.key]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Colegio *</label>
        <select className="input" value={form.colegioId} onChange={e => setForm(p => ({ ...p, colegioId: e.target.value }))}>
          <option value="">Seleccionar colegio...</option>
          {colegios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      <button onClick={handleCreate} disabled={loading} className="btn-primary w-full">
        {loading ? 'Creando...' : 'Crear administrador'}
      </button>
    </div>
  )
}
