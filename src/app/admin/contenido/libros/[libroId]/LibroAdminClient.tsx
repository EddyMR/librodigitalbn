'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, BookOpen, Users, Check, Camera, Mic, ListChecks, X, Film, Link } from 'lucide-react'
import { Modal, Toast, Confirm } from '@/components/ui'
import { cn } from '@/lib/utils'
import Image from 'next/image'

type TipoHoja = 'lectura' | 'escritura_libre' | 'escritura_imagen' | 'foto' | 'audio' | 'cuestionario' | 'multimedia'

interface Hoja { id: string; titulo?: string; tipo: TipoHoja; imagen_url: string; orden: number }
interface Bloque { id: string; titulo: string; descripcion?: string; orden: number; activo: boolean; hojas: Hoja[] }
interface Libro { id: string; titulo: string; bloques: Bloque[] }

interface GrupoAsignacion {
  id: string
  nombre: string
  asignado: boolean
  colegio_id: string
  colegio_nombre: string
  colegio_codigo: string
}

interface Props {
  libro: Libro
  grupos: GrupoAsignacion[]
  libroId: string
}

export default function LibroAdminClient({ libro, grupos: gruposInit, libroId }: Props) {
  const [activeTab, setActiveTab] = useState<'contenido' | 'asignaciones'>('contenido')
  const [bloques, setBloques] = useState(libro.bloques)

  useEffect(() => {
    fetch(`/api/admin/libros/${libroId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.bloques)) setBloques(data.bloques) })
      .catch(() => {})
  }, [libroId])
  const [grupos, setGrupos] = useState(gruposInit)
  const [expandedBloque, setExpandedBloque] = useState<string | null>(null)
  const [showBloqueModal, setShowBloqueModal] = useState(false)
  const [showHojaModal, setShowHojaModal] = useState<string | null>(null)
  const [newBloqueNombre, setNewBloqueNombre] = useState('')
  const [newBloqueDes, setNewBloqueDes] = useState('')
  const [newHojaData, setNewHojaData] = useState({ titulo: '', tipo: 'lectura' as TipoHoja })
  const [preguntas, setPreguntas] = useState<string[]>([])
  const [nuevaPregunta, setNuevaPregunta] = useState('')
  // multimedia
  const [multimediaAudioFile, setMultimediaAudioFile] = useState<File | null>(null)
  const [multimediaVideoFile, setMultimediaVideoFile] = useState<File | null>(null)
  const [multimediaVideoUrl, setMultimediaVideoUrl] = useState('')
  const [multimediaVideoTipo, setMultimediaVideoTipo] = useState<'url' | 'upload'>('url')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'bloque' | 'hoja'; id: string; nombre: string } | null>(null)
  const [previewHoja, setPreviewHoja] = useState<Hoja | null>(null)
  const [togglingGrupo, setTogglingGrupo] = useState<string | null>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleCreateBloque() {
    if (!newBloqueNombre.trim()) return
    const nextOrden = bloques.length > 0 ? Math.max(...bloques.map(b => b.orden)) + 1 : 1

    const res = await fetch('/api/admin/bloques', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        libro_id: libro.id,
        titulo: newBloqueNombre.trim(),
        descripcion: newBloqueDes.trim() || null,
        orden: nextOrden,
      }),
    })
    const data = await res.json()
    if (data.error) { setToast({ msg: 'Error al crear bloque', type: 'error' }); return }

    setBloques(prev => [...prev, { ...data.bloque, hojas: [] }])
    setNewBloqueNombre('')
    setNewBloqueDes('')
    setShowBloqueModal(false)
    setToast({ msg: 'Bloque creado', type: 'success' })
  }

  async function handleCreateHoja(bloqueId: string) {
    if (!imageFile) { setToast({ msg: 'Selecciona una imagen', type: 'error' }); return }
    if (newHojaData.tipo === 'cuestionario' && preguntas.length === 0) {
      setToast({ msg: 'Agrega al menos una pregunta al cuestionario', type: 'error' }); return
    }
    setUploading(true)

    const bloque = bloques.find(b => b.id === bloqueId)
    const nextOrden = bloque && bloque.hojas.length > 0
      ? Math.max(...bloque.hojas.map(h => h.orden)) + 1
      : 1

    const formData = new FormData()
    formData.append('file', imageFile)
    formData.append('bloque_id', bloqueId)
    formData.append('libro_id', libro.id)
    formData.append('titulo', newHojaData.titulo.trim())
    formData.append('tipo', newHojaData.tipo)
    formData.append('orden', String(nextOrden))
    if (newHojaData.tipo === 'cuestionario') {
      formData.append('config', JSON.stringify({ preguntas }))
    }

    if (newHojaData.tipo === 'multimedia') {
      if (multimediaAudioFile) formData.append('audio_file', multimediaAudioFile)
      if (multimediaVideoTipo === 'upload' && multimediaVideoFile) {
        formData.append('video_file', multimediaVideoFile)
      } else if (multimediaVideoTipo === 'url' && multimediaVideoUrl.trim()) {
        formData.append('video_url', multimediaVideoUrl.trim())
      }
    }

    const res = await fetch('/api/admin/hojas', { method: 'POST', body: formData })
    const data = await res.json()

    if (data.error) {
      setToast({ msg: 'Error al crear hoja', type: 'error' })
      setUploading(false)
      return
    }

    setBloques(prev => prev.map(b =>
      b.id === bloqueId ? { ...b, hojas: [...b.hojas, data.hoja as Hoja] } : b
    ))
    setNewHojaData({ titulo: '', tipo: 'lectura' })
    setPreguntas([])
    setNuevaPregunta('')
    setMultimediaAudioFile(null)
    setMultimediaVideoFile(null)
    setMultimediaVideoUrl('')
    setMultimediaVideoTipo('url')
    setImageFile(null)
    setImagePreview(null)
    setShowHojaModal(null)
    setUploading(false)
    setToast({ msg: 'Hoja agregada', type: 'success' })
  }

  async function handleDeleteBloque(id: string) {
    const res = await fetch('/api/admin/bloques', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (data.error) { setToast({ msg: 'Error al eliminar', type: 'error' }); return }
    setBloques(prev => prev.filter(b => b.id !== id))
    setToast({ msg: 'Bloque eliminado', type: 'success' })
    setDeleteConfirm(null)
  }

  async function handleMoveHoja(bloqueId: string, hojaId: string, dir: 'up' | 'down') {
    // Calculate new order before touching state
    const bloque = bloques.find(b => b.id === bloqueId)
    if (!bloque) return
    const hojas = [...bloque.hojas]
    const idx = hojas.findIndex(h => h.id === hojaId)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === hojas.length - 1) return
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[hojas[idx], hojas[swap]] = [hojas[swap], hojas[idx]]
    const newHojaIds = hojas.map(h => h.id)

    // Optimistic UI update
    setBloques(prev => prev.map(b =>
      b.id !== bloqueId ? b : { ...b, hojas: hojas.map((h, i) => ({ ...h, orden: i + 1 })) }
    ))

    // Persist
    const res = await fetch('/api/admin/hojas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloqueId, hojaIds: newHojaIds }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setToast({ msg: data.error ?? 'Error al guardar orden', type: 'error' })
      // Revert
      setBloques(prev => prev.map(b =>
        b.id !== bloqueId ? b : { ...b, hojas: bloque.hojas }
      ))
    }
  }

  async function handleDeleteHoja(bloqueId: string, hojaId: string) {
    const res = await fetch('/api/admin/hojas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: hojaId }),
    })
    const data = await res.json()
    if (data.error) { setToast({ msg: 'Error al eliminar', type: 'error' }); return }
    setBloques(prev => prev.map(b =>
      b.id === bloqueId ? { ...b, hojas: b.hojas.filter(h => h.id !== hojaId) } : b
    ))
    setToast({ msg: 'Hoja eliminada', type: 'success' })
    setDeleteConfirm(null)
  }

  async function handleToggleGrupo(grupoId: string, currentAsignado: boolean) {
    setTogglingGrupo(grupoId)
    setGrupos(prev => prev.map(g => g.id === grupoId ? { ...g, asignado: !currentAsignado } : g))

    try {
      const res = await fetch('/api/admin/libro-grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libro_id: libroId, grupo_id: grupoId, activo: !currentAsignado }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setGrupos(prev => prev.map(g => g.id === grupoId ? { ...g, asignado: currentAsignado } : g))
        setToast({ msg: `Error: ${data.error ?? res.status}`, type: 'error' })
      }
    } catch {
      setGrupos(prev => prev.map(g => g.id === grupoId ? { ...g, asignado: currentAsignado } : g))
      setToast({ msg: 'Error de red al guardar', type: 'error' })
    }
    setTogglingGrupo(null)
  }

  const tipoLabels: Record<TipoHoja, string> = {
    lectura: 'Solo lectura',
    escritura_libre: 'Escritura libre',
    escritura_imagen: 'Escribir sobre imagen',
    foto: 'Subir foto',
    audio: 'Grabar / subir audio',
    cuestionario: 'Cuestionario',
    multimedia: 'Multimedia',
  }

  const tipoMeta: Record<TipoHoja, { desc: string; icon: React.ReactNode }> = {
    lectura:         { desc: 'El alumno solo lee la imagen', icon: <BookOpen className="w-4 h-4" /> },
    escritura_libre: { desc: 'El alumno escribe una respuesta de texto libre', icon: <span className="text-sm">✏️</span> },
    escritura_imagen:{ desc: 'El alumno dibuja y pinta encima de la imagen', icon: <span className="text-sm">🎨</span> },
    foto:            { desc: 'El alumno toma una foto o sube una imagen', icon: <Camera className="w-4 h-4" /> },
    audio:           { desc: 'El alumno graba o sube un audio', icon: <Mic className="w-4 h-4" /> },
    cuestionario:    { desc: 'El alumno responde preguntas específicas', icon: <ListChecks className="w-4 h-4" /> },
    multimedia:      { desc: 'Imagen + audio + video. El alumno responde con texto', icon: <Film className="w-4 h-4" /> },
  }

  // Group by colegio for assignment view
  const gruposPorColegio = grupos.reduce<Record<string, { nombre: string; codigo: string; grupos: GrupoAsignacion[] }>>((acc, g) => {
    if (!acc[g.colegio_id]) acc[g.colegio_id] = { nombre: g.colegio_nombre, codigo: g.colegio_codigo, grupos: [] }
    acc[g.colegio_id].grupos.push(g)
    return acc
  }, {})

  const asignadosCount = grupos.filter(g => g.asignado).length

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {deleteConfirm && (
        <Confirm
          open
          title={`Eliminar ${deleteConfirm.type === 'bloque' ? 'bloque' : 'hoja'}`}
          message={`¿Eliminar "${deleteConfirm.nombre}"?`}
          confirmLabel="Eliminar"
          danger
          onConfirm={() =>
            deleteConfirm.type === 'bloque'
              ? handleDeleteBloque(deleteConfirm.id)
              : handleDeleteHoja(expandedBloque!, deleteConfirm.id)
          }
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {previewHoja && (
        <Modal open onClose={() => setPreviewHoja(null)} title={previewHoja.titulo ?? 'Página'} size="lg">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-slate-400">{tipoLabels[previewHoja.tipo]}</p>
            <div className="w-full flex justify-center">
              <Image
                src={previewHoja.imagen_url}
                alt={previewHoja.titulo ?? 'Hoja'}
                width={400}
                height={700}
                className="rounded-xl object-contain max-h-[70vh]"
              />
            </div>
          </div>
        </Modal>
      )}

      <Modal open={showBloqueModal} onClose={() => setShowBloqueModal(false)} title="Nuevo bloque">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Título del bloque *</label>
            <input className="input" placeholder="Ej: Bloque 1 — La Creación" value={newBloqueNombre} onChange={e => setNewBloqueNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Descripción (opcional)</label>
            <textarea className="input resize-none" rows={2} value={newBloqueDes} onChange={e => setNewBloqueDes(e.target.value)} />
          </div>
          <button onClick={handleCreateBloque} disabled={!newBloqueNombre.trim()} className="btn-primary w-full">
            Crear bloque
          </button>
        </div>
      </Modal>

      {showHojaModal && (
        <Modal open onClose={() => { setShowHojaModal(null); setImageFile(null); setImagePreview(null); setPreguntas([]); setNuevaPregunta(''); setMultimediaAudioFile(null); setMultimediaVideoFile(null); setMultimediaVideoUrl(''); setMultimediaVideoTipo('url') }} title="Nueva hoja" size="lg">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Título (opcional)</label>
              <input className="input" placeholder="Nombre de la hoja" value={newHojaData.titulo} onChange={e => setNewHojaData(p => ({ ...p, titulo: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Tipo de actividad</label>
              <div className="grid grid-cols-1 gap-2">
                {(Object.entries(tipoLabels) as [TipoHoja, string][]).map(([tipo, label]) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setNewHojaData(p => ({ ...p, tipo }))}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      newHojaData.tipo === tipo
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-brand-200'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn('flex-shrink-0', newHojaData.tipo === tipo ? 'text-brand-600' : 'text-slate-400')}>
                        {tipoMeta[tipo].icon}
                      </span>
                      <div>
                        <p className={cn('text-sm font-semibold', newHojaData.tipo === tipo ? 'text-brand-800' : 'text-slate-700')}>{label}</p>
                        <p className="text-xs text-slate-400">{tipoMeta[tipo].desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cuestionario question editor */}
            {newHojaData.tipo === 'cuestionario' && (
              <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-brand-500" />
                  Preguntas del cuestionario
                </p>

                {preguntas.length > 0 && (
                  <div className="space-y-1.5">
                    {preguntas.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200">
                        <span className="text-xs font-bold text-brand-600 mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                        <p className="flex-1 text-sm text-slate-800">{p}</p>
                        <button
                          type="button"
                          onClick={() => setPreguntas(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Escribe una pregunta..."
                    value={nuevaPregunta}
                    onChange={e => setNuevaPregunta(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && nuevaPregunta.trim()) {
                        setPreguntas(prev => [...prev, nuevaPregunta.trim()])
                        setNuevaPregunta('')
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!nuevaPregunta.trim()}
                    onClick={() => { setPreguntas(prev => [...prev, nuevaPregunta.trim()]); setNuevaPregunta('') }}
                    className="btn-primary px-3 py-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {preguntas.length === 0 && (
                  <p className="text-xs text-slate-400">Agrega al menos una pregunta</p>
                )}
              </div>
            )}

            {/* Multimedia config */}
            {newHojaData.tipo === 'multimedia' && (
              <div className="space-y-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Film className="w-4 h-4 text-brand-500" />
                  Contenido multimedia <span className="font-normal text-slate-400">(opcional)</span>
                </p>

                {/* Audio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" /> Audio
                  </label>
                  {multimediaAudioFile ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                      <Mic className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span className="text-xs text-slate-700 flex-1 truncate">{multimediaAudioFile.name}</span>
                      <button type="button" onClick={() => setMultimediaAudioFile(null)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Subir archivo de audio (MP3, WAV, M4A…)</span>
                      <input type="file" accept="audio/*" className="hidden" onChange={e => setMultimediaAudioFile(e.target.files?.[0] ?? null)} />
                    </label>
                  )}
                </div>

                {/* Video */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" /> Video
                  </label>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    {(['url', 'upload'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMultimediaVideoTipo(t)}
                        className={cn(
                          'flex-1 py-1.5 text-xs font-medium transition-colors',
                          multimediaVideoTipo === t ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                        )}
                      >
                        {t === 'url' ? '🔗 URL / YouTube' : '📁 Subir video'}
                      </button>
                    ))}
                  </div>

                  {multimediaVideoTipo === 'url' ? (
                    <input
                      className="input text-sm"
                      placeholder="https://youtube.com/watch?v=... o URL directa de video"
                      value={multimediaVideoUrl}
                      onChange={e => setMultimediaVideoUrl(e.target.value)}
                    />
                  ) : multimediaVideoFile ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                      <Film className="w-4 h-4 text-brand-500 flex-shrink-0" />
                      <span className="text-xs text-slate-700 flex-1 truncate">{multimediaVideoFile.name}</span>
                      <button type="button" onClick={() => setMultimediaVideoFile(null)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-colors">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Subir archivo de video (MP4, WebM…)</span>
                      <input type="file" accept="video/*" className="hidden" onChange={e => setMultimediaVideoFile(e.target.files?.[0] ?? null)} />
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Imagen de la hoja * <span className="text-slate-400 font-normal">(formato vertical, ej: 430×932px)</span>
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-brand-400 transition-colors">
                {imagePreview ? (
                  <Image src={imagePreview} alt="Preview" width={120} height={240} className="rounded-lg object-cover" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">Toca para seleccionar imagen</p>
                    <p className="text-xs text-slate-300 mt-1">PNG, JPG, WEBP</p>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>

            <button
              onClick={() => handleCreateHoja(showHojaModal)}
              disabled={uploading || !imageFile}
              className="btn-primary w-full"
            >
              {uploading ? 'Subiendo...' : 'Agregar hoja'}
            </button>
          </div>
        </Modal>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
        <button
          onClick={() => setActiveTab('contenido')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all',
            activeTab === 'contenido'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <BookOpen className="w-4 h-4" />
          Contenido
        </button>
        <button
          onClick={() => setActiveTab('asignaciones')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all',
            activeTab === 'asignaciones'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Users className="w-4 h-4" />
          Asignaciones
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-full font-semibold',
            activeTab === 'asignaciones' ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500'
          )}>
            {asignadosCount}/{grupos.length}
          </span>
        </button>
      </div>

      {activeTab === 'contenido' && (
        <div className="space-y-3">
          <button onClick={() => setShowBloqueModal(true)} className="btn-primary w-full">
            <Plus className="w-4 h-4" /> Agregar bloque
          </button>

          {bloques.map((bloque, idx) => (
            <div key={bloque.id} className="card overflow-hidden">
              <button
                onClick={() => setExpandedBloque(expandedBloque === bloque.id ? null : bloque.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{bloque.titulo}</p>
                  <p className="text-xs text-slate-400">{bloque.hojas.length} hojas</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: 'bloque', id: bloque.id, nombre: bloque.titulo }) }}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedBloque === bloque.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {expandedBloque === bloque.id && (
                <div className="border-t border-slate-100">
                  {bloque.hojas.map((hoja, hojaIdx) => (
                    <div key={hoja.id} className="flex items-center gap-2 px-3 py-3 border-b border-slate-50 hover:bg-slate-50">
                      <div className="flex flex-col flex-shrink-0">
                        <button
                          onClick={() => handleMoveHoja(bloque.id, hoja.id, 'up')}
                          disabled={hojaIdx === 0}
                          className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          title="Subir"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveHoja(bloque.id, hoja.id, 'down')}
                          disabled={hojaIdx === bloque.hojas.length - 1}
                          className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          title="Bajar"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      {hoja.imagen_url && (
                        <button onClick={() => setPreviewHoja(hoja)} className="flex-shrink-0">
                          <Image src={hoja.imagen_url} alt="Hoja" width={32} height={48} className="rounded-lg object-cover hover:ring-2 hover:ring-brand-400 transition-all" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreviewHoja(hoja)}>
                        <p className="text-sm font-medium text-slate-800 truncate">{hoja.titulo ?? `Hoja ${hojaIdx + 1}`}</p>
                        <span className="text-xs text-slate-400">{tipoLabels[hoja.tipo]}</span>
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'hoja', id: hoja.id, nombre: hoja.titulo ?? 'esta hoja' })}
                        className="p-1.5 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => setShowHojaModal(bloque.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-brand-600 hover:bg-brand-50 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> Agregar hoja
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'asignaciones' && (
        <div className="space-y-6">
          <p className="text-sm text-slate-500">
            Activa o desactiva el acceso a este libro para cada grupo. Los grupos con acceso activo podrán ver el libro en su panel.
          </p>

          {Object.entries(gruposPorColegio).map(([colegioId, colegio]) => (
            <div key={colegioId}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{colegio.codigo.slice(0, 2).toUpperCase()}</span>
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">{colegio.nombre}</h3>
              </div>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {colegio.grupos.map(grupo => (
                  <div key={grupo.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{grupo.nombre}</p>
                    </div>
                    <button
                      onClick={() => handleToggleGrupo(grupo.id, grupo.asignado)}
                      disabled={togglingGrupo === grupo.id}
                      className={cn(
                        'w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0',
                        grupo.asignado ? 'bg-brand-500' : 'bg-slate-200',
                        togglingGrupo === grupo.id && 'opacity-50'
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200',
                        grupo.asignado ? 'left-5' : 'left-0.5'
                      )} />
                    </button>
                    {grupo.asignado && (
                      <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(gruposPorColegio).length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-slate-400 text-sm">No hay grupos activos registrados</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
