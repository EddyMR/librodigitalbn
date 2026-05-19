'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CrearColegioForm() {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  async function handleCreate() {
    if (!nombre.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/colegios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim() }),
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
    } else {
      setSuccess(`Colegio creado con código: ${data.codigo}`)
      setNombre('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Nombre del colegio"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={loading || !nombre.trim()}
          className="btn-primary px-5"
        >
          {loading ? '...' : 'Crear'}
        </button>
      </div>
    </div>
  )
}
