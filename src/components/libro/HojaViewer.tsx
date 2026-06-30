'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Send, MessageSquare, Pencil,
  ChevronRight, BookOpen, Loader2, Camera, Mic,
  Square, Upload, Play, Pause, Eraser, WifiOff,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatFechaHora } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { enqueueEntrega } from '@/lib/offline-queue'
import type { Hoja, Entrega, Comentario, ZonaEscritura } from '@/types'

const AUTOSAVE_MS = 1500

const DRAW_COLORS = ['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#ea580c', '#9333ea', '#ffffff']
const BRUSH_SIZES = [3, 6, 12]

interface Props {
  hoja: Hoja & { zonas_escritura: ZonaEscritura[] }
  alumnoId?: string
  entregaExistente: Entrega | null
  comentarioCatequista: Comentario | null
  codigo: string
  libroId: string
  bloqueId: string
  nextHojaId?: string
}

export default function HojaViewer({
  hoja, alumnoId, entregaExistente, comentarioCatequista,
  codigo, libroId, bloqueId, nextHojaId,
}: Props) {
  // ── Text states ──────────────────────────────────────────────
  const [texto, setTexto] = useState(entregaExistente?.contenido?.texto ?? '')
  const [zonasTexto, setZonasTexto] = useState<Record<string, string>>(
    entregaExistente?.contenido?.zonas ?? {}
  )
  const [respuestas, setRespuestas] = useState<string[]>(
    entregaExistente?.contenido?.respuestas ?? []
  )

  // ── Media states ─────────────────────────────────────────────
  const [fotoUrl, setFotoUrl] = useState(entregaExistente?.contenido?.foto_url ?? '')
  const [audioUrl, setAudioUrl] = useState(entregaExistente?.contenido?.audio_url ?? '')
  const [recording, setRecording] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ── Drawing states (escritura_libre) ─────────────────────────
  const [dibujoUrl, setDibujoUrl] = useState(entregaExistente?.contenido?.dibujo_url ?? '')
  const [canvasHasContent, setCanvasHasContent] = useState(
    !!entregaExistente?.contenido?.dibujo_url
  )
  const [brushColor, setBrushColor] = useState('#0f172a')
  const [brushSize, setBrushSize] = useState(6)
  const [toolMode, setToolMode] = useState<'brush' | 'eraser'>('brush')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageContainerRef = useRef<HTMLDivElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const canvasDirtyRef = useRef(false)
  const canvasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Save / submit states ─────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'offline'>('idle')
  const [estado, setEstado] = useState<'borrador' | 'entregado'>(
    entregaExistente?.estado ?? 'borrador'
  )
  const [entregando, setEntregando] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const preguntas = hoja.config?.preguntas ?? []

  // Si hay una entrega pendiente en la cola offline para esta hoja, mostrar estado offline al montar
  useEffect(() => {
    if (!alumnoId) return
    import('@/lib/offline-queue').then(({ getPendingEntregas }) => {
      getPendingEntregas().then(pending => {
        if (pending.some(p => p.alumno_id === alumnoId && p.hoja_id === hoja.id)) {
          setSaveStatus('offline')
        }
      })
    })
  }, [alumnoId, hoja.id])

  // Cuando el SyncStatus sincroniza esta hoja, actualizar el indicador
  useEffect(() => {
    function onSynced(e: Event) {
      const { hoja_id } = (e as CustomEvent<{ hoja_id: string }>).detail
      if (hoja_id === hoja.id) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      }
    }
    window.addEventListener('entrega-synced', onSynced)
    return () => window.removeEventListener('entrega-synced', onSynced)
  }, [hoja.id])

  // Register visit (solo si hay conexión)
  useEffect(() => {
    if (!alumnoId || !navigator.onLine) return
    supabase.rpc('registrar_visita', { p_alumno_id: alumnoId, p_hoja_id: hoja.id })
  }, [hoja.id, alumnoId])

  // ── Canvas initialization (load size + existing drawing) ─────
  useEffect(() => {
    if (hoja.tipo !== 'escritura_imagen' || !alumnoId) return

    function initCanvas() {
      const container = imageContainerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return false
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return false
      canvas.width = Math.round(rect.width)
      canvas.height = Math.round(rect.height)

      const existingUrl = entregaExistente?.contenido?.dibujo_url
      if (existingUrl) {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const ctx = canvas.getContext('2d')
          if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
        img.onerror = () => {
          // CORS failed — load without crossOrigin (canvas will be tainted but drawing still visible)
          const img2 = new window.Image()
          img2.onload = () => {
            const ctx = canvas.getContext('2d')
            if (ctx) ctx.drawImage(img2, 0, 0, canvas.width, canvas.height)
          }
          img2.src = existingUrl
        }
        img.src = existingUrl
      }
      return true
    }

    // Try immediately, then retry with increasing delays if layout isn't ready
    if (initCanvas()) return
    const t1 = setTimeout(() => { if (!initCanvas()) {
      const t2 = setTimeout(() => initCanvas(), 300)
      return () => clearTimeout(t2)
    }}, 150)
    return () => clearTimeout(t1)
  }, [hoja.tipo, alumnoId])

  // ── hasContent ───────────────────────────────────────────────
  const hasContent = (() => {
    switch (hoja.tipo) {
      case 'escritura_libre':  return texto.trim().length > 0
      case 'escritura_imagen': return canvasHasContent
      case 'foto':             return fotoUrl.length > 0
      case 'audio':            return audioUrl.length > 0
      case 'cuestionario':     return respuestas.some(r => r.trim().length > 0)
      case 'multimedia':       return texto.trim().length > 0
      default:                 return false
    }
  })()

  // ── Save ─────────────────────────────────────────────────────
  const save = useCallback(async (entregar = false): Promise<boolean> => {
    if (!alumnoId) return false
    setSaveStatus('saving')

    let contenido: Record<string, unknown> = {}

    if (hoja.tipo === 'escritura_libre') {
      contenido = { texto }
    }
    else if (hoja.tipo === 'escritura_imagen') {
      let url = dibujoUrl
      if (canvasDirtyRef.current && canvasRef.current) {
        setUploadingMedia(true)
        const blob: Blob | null = await new Promise(resolve =>
          canvasRef.current!.toBlob(resolve, 'image/png')
        )
        if (blob && blob.size > 0) {
          const file = new File([blob], 'dibujo.png', { type: 'image/png' })
          const fd = new FormData()
          fd.append('file', file)
          fd.append('hoja_id', hoja.id)
          fd.append('tipo', 'dibujo')
          try {
            const res = await fetch('/api/colegio/uploads', { method: 'POST', body: fd })
            if (res.ok) {
              const data = await res.json()
              url = data.url as string
              setDibujoUrl(url)
              canvasDirtyRef.current = false
            }
          } catch {
            // Upload failed — keep existing url
          }
        }
        setUploadingMedia(false)
      }
      contenido = { dibujo_url: url }
    }
    else if (hoja.tipo === 'foto')        contenido = { foto_url: fotoUrl }
    else if (hoja.tipo === 'audio')       contenido = { audio_url: audioUrl }
    else if (hoja.tipo === 'cuestionario') contenido = { respuestas }
    else if (hoja.tipo === 'multimedia')  contenido = { texto }

    const now = new Date().toISOString()
    const upsertData = {
      alumno_id: alumnoId,
      hoja_id: hoja.id,
      contenido,
      estado: entregar ? 'entregado' : 'borrador',
      fecha_modificacion: now,
      ...(entregar ? { fecha_entrega: now } : {}),
    } as const

    // Si no hay conexión, encolar directamente sin intentar la red
    if (!navigator.onLine) {
      await enqueueEntrega(upsertData)
      setSaveStatus('offline')
      return true
    }

    const { error } = await supabase.from('entregas').upsert(
      upsertData,
      { onConflict: 'alumno_id,hoja_id' }
    )

    if (error) {
      // Puede haberse ido offline entre el check y el request
      await enqueueEntrega(upsertData)
      setSaveStatus('offline')
      return true
    }

    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2500)
    return true
  }, [alumnoId, hoja.id, hoja.tipo, texto, zonasTexto, fotoUrl, audioUrl, respuestas, dibujoUrl])

  // Keep a ref to the latest save so canvas timer always calls the fresh closure
  const saveRef = useRef(save)
  useEffect(() => { saveRef.current = save }, [save])

  // Auto-save when content changes (non-canvas types)
  useEffect(() => {
    if (!alumnoId || !hasContent) return
    if (hoja.tipo === 'escritura_imagen') return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(false), AUTOSAVE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [texto, zonasTexto, fotoUrl, audioUrl, respuestas])

  // ── Submit ───────────────────────────────────────────────────
  async function handleEntregar() {
    if (!hasContent) return
    setEntregando(true)
    if (canvasTimerRef.current) clearTimeout(canvasTimerRef.current)
    const ok = await save(true)
    if (ok) setEstado('entregado')
    setEntregando(false)
  }

  // ── Media upload ─────────────────────────────────────────────
  async function uploadMedia(file: File, tipo: string): Promise<string | null> {
    if (!navigator.onLine) return null
    setUploadingMedia(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('hoja_id', hoja.id)
      fd.append('tipo', tipo)
      const res = await fetch('/api/colegio/uploads', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) return null
      return data.url as string
    } catch {
      return null
    } finally {
      setUploadingMedia(false)
    }
  }

  // ── Foto handler ─────────────────────────────────────────────
  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadMedia(file, 'foto')
    if (url) setFotoUrl(url)
  }

  // ── Audio recorder ────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const mimeType = mr.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `grabacion.${ext}`, { type: mimeType })
        const url = await uploadMedia(file, 'audio')
        if (url) setAudioUrl(url)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
    } catch {
      // Microphone permission denied or unavailable
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function handleAudioFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadMedia(file, 'audio')
    if (url) setAudioUrl(url)
  }

  // ── YouTube helpers ───────────────────────────────────────────
  function getYouTubeEmbedUrl(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null
  }

  // ── Cuestionario helpers ──────────────────────────────────────
  function setRespuesta(i: number, valor: string) {
    setRespuestas(prev => {
      const next = [...prev]
      next[i] = valor
      return next
    })
  }

  // ── Canvas drawing handlers ───────────────────────────────────
  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return
    // Lazily fix canvas size if initialization ran before layout was ready
    if (canvas.width <= 300 && imageContainerRef.current) {
      const rect = imageContainerRef.current.getBoundingClientRect()
      if (rect.width > 300 && rect.height > 0) {
        canvas.width = Math.round(rect.width)
        canvas.height = Math.round(rect.height)
      }
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasPos(e)
    lastPosRef.current = { x, y }
    const size = toolMode === 'eraser' ? brushSize * 3 : brushSize
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    if (toolMode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = brushColor
    }
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasPos(e)
    const size = toolMode === 'eraser' ? brushSize * 3 : brushSize
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(x, y)
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (toolMode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = brushColor
    }
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    lastPosRef.current = { x, y }
  }

  function stopDrawing() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    canvasDirtyRef.current = true
    setCanvasHasContent(true)
    if (canvasTimerRef.current) clearTimeout(canvasTimerRef.current)
    canvasTimerRef.current = setTimeout(() => {
      saveRef.current(false)
    }, AUTOSAVE_MS)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setCanvasHasContent(false)
    canvasDirtyRef.current = false
    if (canvasTimerRef.current) clearTimeout(canvasTimerRef.current)
  }

  const isInteractive = hoja.tipo !== 'lectura'

  return (
    <div className="bg-white">

      {/* ── Image + overlays ───────────────────────────────────── */}
      <div className="relative w-full" ref={imageContainerRef}>
        <Image
          src={hoja.imagen_url}
          alt={hoja.titulo ?? 'Página'}
          width={430}
          height={932}
          className="w-full h-auto block"
          priority
        />

        {/* Drawing canvas overlay (escritura_imagen) */}
        {hoja.tipo === 'escritura_imagen' && alumnoId && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            onPointerCancel={stopDrawing}
          />
        )}
      </div>

      {/* ── Drawing toolbar (escritura_imagen) ───────────────────── */}
      {hoja.tipo === 'escritura_imagen' && alumnoId && (
        <div className="bg-white px-4 py-3 border-b border-slate-100 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-brand-100 flex items-center justify-center">
                <Pencil className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <span className="text-sm font-semibold text-slate-800">Dibuja encima</span>
            </div>
            <div className="flex items-center gap-2">
              <SaveIndicator status={saveStatus} />
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-slate-500 font-medium px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Colors + eraser */}
          <div className="flex items-center gap-2 flex-wrap">
            {DRAW_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => { setBrushColor(color); setToolMode('brush') }}
                className="w-8 h-8 rounded-full transition-transform active:scale-90 flex-shrink-0"
                style={{
                  backgroundColor: color,
                  boxShadow:
                    brushColor === color && toolMode === 'brush'
                      ? `0 0 0 2.5px white, 0 0 0 4.5px ${color === '#ffffff' ? '#94a3b8' : color}`
                      : color === '#ffffff'
                      ? '0 0 0 1.5px #e2e8f0'
                      : 'none',
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setToolMode('eraser')}
              className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                toolMode === 'eraser'
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              )}
            >
              <Eraser className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Brush sizes */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-0.5">Grosor:</span>
            {BRUSH_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                className={cn(
                  'w-10 h-8 rounded-xl flex items-center justify-center transition-all border-2',
                  brushSize === size
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-transparent bg-slate-100 hover:bg-slate-200'
                )}
              >
                <div
                  className="rounded-full"
                  style={{
                    backgroundColor:
                      toolMode === 'brush'
                        ? (brushColor === '#ffffff' ? '#e2e8f0' : brushColor)
                        : '#94a3b8',
                    width: Math.max(size * 2, 4),
                    height: Math.max(size * 2, 4),
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Escritura libre (textarea) ───────────────────────── */}
      {hoja.tipo === 'escritura_libre' && alumnoId && (
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Pencil className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm leading-tight">Tu respuesta</p>
              <p className="text-xs text-slate-400 mt-0.5">Se guarda automáticamente</p>
            </div>
            <SaveIndicator status={saveStatus} />
          </div>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Escribe tu respuesta aquí..."
            rows={6}
            className={cn(
              'w-full px-4 py-3.5 rounded-2xl border-2 text-slate-900 text-base',
              'placeholder:text-slate-300 resize-none transition-all leading-relaxed',
              'focus:outline-none',
              estado === 'entregado'
                ? 'border-emerald-200 bg-emerald-50/40 focus:border-emerald-400'
                : 'border-slate-200 bg-slate-50 focus:border-brand-400 focus:bg-white focus:shadow-sm'
            )}
          />
        </div>
      )}

      {/* ── Foto ─────────────────────────────────────────────── */}
      {hoja.tipo === 'foto' && alumnoId && (
        <div className="px-4 pt-5 pb-3 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0">
              <Camera className="w-4 h-4 text-sky-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">Tu foto</p>
              <p className="text-xs text-slate-400">Toma una foto o selecciona una imagen</p>
            </div>
            <SaveIndicator status={saveStatus} />
          </div>

          {fotoUrl ? (
            <div className="relative">
              <Image
                src={fotoUrl}
                alt="Foto del alumno"
                width={400}
                height={300}
                className="w-full rounded-2xl object-cover max-h-64"
              />
              <label className={cn(
                'absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all',
                estado === 'entregado'
                  ? 'bg-emerald-600/90 text-white'
                  : 'bg-slate-900/80 text-white hover:bg-slate-900'
              )}>
                <Camera className="w-3.5 h-3.5" />
                Cambiar foto
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoChange} disabled={uploadingMedia} />
              </label>
            </div>
          ) : (
            <label className={cn(
              'flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all',
              uploadingMedia
                ? 'border-brand-300 bg-brand-50 cursor-wait'
                : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/50'
            )}>
              {uploadingMedia ? (
                <><Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
                  <p className="text-sm text-brand-600 font-medium">Subiendo foto...</p></>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-sky-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-800 text-sm">Tomar foto o subir imagen</p>
                    <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WEBP</p>
                  </div>
                </>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoChange} disabled={uploadingMedia} />
            </label>
          )}
        </div>
      )}

      {/* ── Audio ─────────────────────────────────────────────── */}
      {hoja.tipo === 'audio' && alumnoId && (
        <div className="px-4 pt-5 pb-3 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">Tu audio</p>
              <p className="text-xs text-slate-400">Graba tu voz o sube un archivo</p>
            </div>
            <SaveIndicator status={saveStatus} />
          </div>

          <div className="flex gap-2">
            {!recording ? (
              <button
                onClick={startRecording}
                disabled={uploadingMedia}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold transition-all disabled:opacity-50"
              >
                <Mic className="w-4 h-4" />
                {audioUrl ? 'Grabar de nuevo' : 'Grabar audio'}
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold transition-all animate-pulse"
              >
                <Square className="w-4 h-4 fill-current" />
                Detener grabación
              </button>
            )}
          </div>

          {!recording && (
            <label className="flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium cursor-pointer hover:border-brand-300 hover:text-brand-600 transition-all">
              <Upload className="w-4 h-4" />
              {uploadingMedia ? 'Subiendo...' : 'O subir archivo de audio'}
              <input type="file" accept="audio/*" className="hidden" onChange={handleAudioFileChange} disabled={uploadingMedia || recording} />
            </label>
          )}

          {audioUrl && !recording && (
            <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (!audioRef.current) {
                      audioRef.current = new Audio(audioUrl)
                      audioRef.current.onended = () => setAudioPlaying(false)
                    }
                    if (audioPlaying) {
                      audioRef.current.pause()
                      setAudioPlaying(false)
                    } else {
                      audioRef.current.src = audioUrl
                      audioRef.current.play()
                      setAudioPlaying(true)
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white flex-shrink-0"
                >
                  {audioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div>
                  <p className="text-sm font-semibold text-purple-800">Audio grabado</p>
                  <p className="text-xs text-purple-400">Toca para escuchar</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-purple-400 ml-auto" />
              </div>
            </div>
          )}

          {recording && (
            <div className="flex items-center justify-center gap-2 py-3 bg-red-50 rounded-2xl border border-red-100">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold text-red-700">Grabando...</span>
            </div>
          )}
        </div>
      )}

      {/* ── Cuestionario ─────────────────────────────────────── */}
      {hoja.tipo === 'cuestionario' && alumnoId && preguntas.length > 0 && (
        <div className="px-4 pt-5 pb-3 space-y-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-base">📝</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">Responde las preguntas</p>
              <p className="text-xs text-slate-400">Se guarda automáticamente</p>
            </div>
            <SaveIndicator status={saveStatus} />
          </div>

          {preguntas.map((pregunta, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="font-medium text-slate-800 text-sm leading-snug flex-1">{pregunta}</p>
              </div>
              <textarea
                value={respuestas[i] ?? ''}
                onChange={e => setRespuesta(i, e.target.value)}
                placeholder="Escribe tu respuesta..."
                rows={3}
                className={cn(
                  'w-full px-3.5 py-3 rounded-xl border-2 text-slate-900 text-sm',
                  'placeholder:text-slate-300 resize-none transition-all leading-relaxed',
                  'focus:outline-none',
                  estado === 'entregado'
                    ? 'border-emerald-200 bg-emerald-50/40 focus:border-emerald-400'
                    : 'border-slate-200 bg-slate-50 focus:border-brand-400 focus:bg-white'
                )}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Multimedia ──────────────────────────────────────── */}
      {hoja.tipo === 'multimedia' && (
        <div className="space-y-4 pb-2">
          {/* Normalize config to medios list (supports both new multi-item and legacy single audio/video) */}
          {(() => {
            const cfg = hoja.config as any
            const medios: { tipo: 'audio' | 'video'; url: string; video_tipo?: string }[] =
              cfg?.medios?.length
                ? cfg.medios
                : [
                    ...(cfg?.audio_url ? [{ tipo: 'audio' as const, url: cfg.audio_url }] : []),
                    ...(cfg?.video_url ? [{ tipo: 'video' as const, url: cfg.video_url, video_tipo: cfg.video_tipo }] : []),
                  ]

            return medios.map((m, i) => {
              if (m.tipo === 'audio') {
                return (
                  <div key={i} className="mx-4 mt-4 bg-purple-50 rounded-2xl border border-purple-100 p-4">
                    <p className="text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5" /> Audio {medios.filter(x => x.tipo === 'audio').length > 1 ? i + 1 : ''}
                    </p>
                    <audio controls src={m.url} className="w-full" style={{ height: '40px' }} />
                  </div>
                )
              }
              const embedUrl = getYouTubeEmbedUrl(m.url)
              return embedUrl ? (
                <div key={i} className="mx-4 rounded-2xl overflow-hidden border border-slate-200 bg-black">
                  <iframe
                    src={embedUrl}
                    className="w-full aspect-video"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    title="Video"
                  />
                </div>
              ) : (
                <div key={i} className="mx-4 rounded-2xl overflow-hidden border border-slate-200 bg-black">
                  <video controls src={m.url} className="w-full aspect-video" playsInline />
                </div>
              )
            })
          })()}

          {/* Text response */}
          {alumnoId && (
            <div className="px-4 pb-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Pencil className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">Tu respuesta</p>
                  <p className="text-xs text-slate-400 mt-0.5">Se guarda automáticamente</p>
                </div>
                <SaveIndicator status={saveStatus} />
              </div>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                rows={5}
                className={cn(
                  'w-full px-4 py-3.5 rounded-2xl border-2 text-slate-900 text-base',
                  'placeholder:text-slate-300 resize-none transition-all leading-relaxed',
                  'focus:outline-none',
                  estado === 'entregado'
                    ? 'border-emerald-200 bg-emerald-50/40 focus:border-emerald-400'
                    : 'border-slate-200 bg-slate-50 focus:border-brand-400 focus:bg-white focus:shadow-sm'
                )}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Catequista comment ───────────────────────────────── */}
      {comentarioCatequista && (
        <div className="mx-4 my-2 rounded-2xl border border-amber-200 overflow-hidden">
          <button
            onClick={() => setShowComment(p => !p)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 text-left"
          >
            <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-amber-800 flex-1">
              Comentario de tu catequista
            </span>
            <ChevronRight className={cn(
              'w-4 h-4 text-amber-400 transition-transform duration-200',
              showComment && 'rotate-90'
            )} />
          </button>
          {showComment && (
            <div className="px-4 pt-3 pb-4 bg-amber-50/50 space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                {comentarioCatequista.contenido}
              </p>
              <p className="text-xs text-slate-400">
                {formatFechaHora(comentarioCatequista.fecha_comentario)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Action zone ──────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-28 space-y-3">

        {isInteractive && alumnoId && (
          estado !== 'entregado' ? (
            <button
              onClick={handleEntregar}
              disabled={entregando || !hasContent || uploadingMedia}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-4 rounded-2xl',
                'font-semibold text-base transition-all duration-200',
                hasContent && !entregando && !uploadingMedia
                  ? 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white shadow-md'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {entregando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Entregando...</>
                : uploadingMedia
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando dibujo...</>
                : <><Send className="w-4 h-4" /> Entregar respuesta</>
              }
            </button>
          ) : (
            <div className="space-y-2">
              <div className="w-full flex items-center justify-center gap-2.5 py-3.5
                              rounded-2xl bg-emerald-50 border-2 border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-700">Respuesta entregada</span>
              </div>
              <p className="text-center text-xs text-slate-400 px-4">
                Puedes editar y se guardará automáticamente
              </p>
            </div>
          )
        )}

        {nextHojaId ? (
          <button
            onClick={() => router.push(`/${codigo}/libros/${libroId}/${bloqueId}/${nextHojaId}`)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                       bg-slate-900 hover:bg-slate-800 active:scale-[0.98]
                       text-white font-semibold transition-all"
          >
            Siguiente página
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => router.push(`/${codigo}/libros/${libroId}`)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                       bg-slate-100 hover:bg-slate-200 active:scale-[0.98]
                       text-slate-700 font-semibold transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Volver al libro
          </button>
        )}
      </div>
    </div>
  )
}

// ── Save status indicator ────────────────────────────────────
function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' | 'offline' }) {
  if (status === 'idle') return null
  return (
    <div className="flex items-center gap-1 text-xs animate-fade-in">
      {status === 'saving' && (
        <><Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
          <span className="text-slate-400">Guardando...</span></>
      )}
      {status === 'saved' && (
        <><CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span className="text-emerald-600 font-medium">Guardado</span></>
      )}
      {status === 'offline' && (
        <><WifiOff className="w-3 h-3 text-amber-500" />
          <span className="text-amber-600 font-medium">Sin conexión</span></>
      )}
      {status === 'error' && (
        <span className="text-red-500 font-medium">Error al guardar</span>
      )}
    </div>
  )
}
