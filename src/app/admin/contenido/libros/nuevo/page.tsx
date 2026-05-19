'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload } from 'lucide-react'
import Image from 'next/image'

export default function NuevoLibroPage() {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    const reader = new FileReader()
    reader.onload = ev => setCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleCreate() {
    if (!titulo.trim()) return
    setLoading(true); setError('')

    let portada_url = null

    if (coverFile) {
      const formData = new FormData()
      formData.append('file', coverFile)
      formData.append('bloque_id', 'portadas')
      formData.append('libro_id', 'portadas')
      formData.append('titulo', '')
      formData.append('tipo', 'lectura')
      formData.append('orden', '0')
      formData.append('is_portada', 'true')

      const uploadRes = await fetch('/api/admin/upload-portada', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (uploadData.error) { setError('Error al subir portada'); setLoading(false); return }
      portada_url = uploadData.url
    }

    const res = await fetch('/api/admin/libros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: titulo.trim(), descripcion: descripcion.trim() || null, portada_url, orden: 0 }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    router.push(`/admin/contenido/libros/${data.libro.id}`)
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5">
        <a href="/admin/contenido" className="text-slate-400 text-sm hover:text-white flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Contenido
        </a>
        <h1 className="text-xl font-bold text-white mt-1">Nuevo libro</h1>
      </div>

      <div className="px-6 py-6 max-w-md mx-auto space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <div className="card p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Portada (opcional)</label>
            <label className="relative flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-brand-400 transition-colors overflow-hidden" style={{ height: 140 }}>
              {coverPreview ? (
                <Image src={coverPreview} alt="Portada" fill className="object-cover" sizes="(max-width: 448px) 100vw, 448px" />
              ) : (
                <div className="text-center">
                  <Upload className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Subir portada</p>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleCover} />
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Título *</label>
            <input className="input" placeholder="Ej: Libro 1 — Conociendo a Dios" value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Descripción (opcional)</label>
            <textarea className="input resize-none" rows={3} placeholder="Descripción del libro..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          </div>

          <button onClick={handleCreate} disabled={loading || !titulo.trim()} className="btn-primary w-full">
            {loading ? 'Creando...' : 'Crear libro'}
          </button>
        </div>
      </div>
    </div>
  )
}
