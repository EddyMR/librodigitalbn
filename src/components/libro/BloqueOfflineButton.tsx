'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { getBlockMeta, saveBlockMeta } from '@/lib/offline-queue'

interface Hoja {
  id: string
  imagen_url: string | null
}

interface Props {
  libroId: string
  bloqueId: string
  bloqueTitulo: string
  codigo: string
  hojas: Hoja[]
}

type Status = 'checking' | 'idle' | 'downloading' | 'cached' | 'error'

export default function BloqueOfflineButton({
  libroId, bloqueId, bloqueTitulo, codigo, hojas,
}: Props) {
  const [status, setStatus] = useState<Status>('checking')
  const [progress, setProgress] = useState(0) // 0-100

  useEffect(() => {
    if (typeof caches === 'undefined') { setStatus('idle'); return }
    getBlockMeta(libroId, bloqueId).then(meta => {
      if (meta) {
        // Keep the last-downloaded libro URL fresh so offline.html can redirect there
        try { localStorage.setItem('offline-last-book', `/${codigo}/libros/${libroId}`) } catch {}
        setStatus('cached')
      } else {
        setStatus('idle')
      }
    })
  }, [libroId, bloqueId, codigo])

  const download = useCallback(async () => {
    setStatus('downloading')
    setProgress(0)
    const total = hojas.length
    if (total === 0) { setStatus('idle'); return }

    try {
      const pageCache = await caches.open('hoja-pages')

      // Cache the pages the reader navigates to from here: the libro detail
      // page (where the app lands when offline) and the alumno home, so the
      // bottom nav doesn't dead-end without connection.
      const libroUrl = `/${codigo}/libros/${libroId}`
      for (const url of [libroUrl, `/${codigo}/inicio`]) {
        try {
          const res = await fetch(url)
          if (res.ok) await pageCache.put(url, res)
        } catch {}
      }

      for (let i = 0; i < hojas.length; i++) {
        const hoja = hojas[i]

        // Prefetch image — SW's CacheFirst rule will cache it
        if (hoja.imagen_url) {
          try { await fetch(hoja.imagen_url, { mode: 'cors' }) } catch {}
        }

        // Cache the hoja page directly into the SW cache
        const pageUrl = `/${codigo}/libros/${libroId}/${bloqueId}/${hoja.id}`
        try {
          const res = await fetch(pageUrl)
          if (res.ok) await pageCache.put(pageUrl, res)
        } catch {}

        setProgress(Math.round(((i + 1) / total) * 100))
      }

      await saveBlockMeta({ libroId, bloqueId, bloqueTitulo, hojaCount: hojas.length, cachedAt: new Date().toISOString() })
      // Save libro URL so OfflineRedirect on root "/" can jump here when offline
      localStorage.setItem('offline-last-book', `/${codigo}/libros/${libroId}`)
      setStatus('cached')
    } catch {
      setStatus('error')
    }
  }, [libroId, bloqueId, bloqueTitulo, codigo, hojas])

  // Don't render server-side or when Cache API unavailable (no-HTTPS)
  if (typeof window === 'undefined') return null
  if (status === 'checking') return null

  if (status === 'downloading') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
        <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
        <span>{progress}%</span>
      </div>
    )
  }

  if (status === 'cached') {
    return (
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); download() }}
        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
        title="Disponible sin conexión. Toca para actualizar."
      >
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Guardado</span>
      </button>
    )
  }

  if (status === 'error') {
    return (
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); download() }}
        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
        title="Error al descargar. Toca para reintentar."
      >
        <RefreshCw className="w-3 h-3 flex-shrink-0" />
        <span>Reintentar</span>
      </button>
    )
  }

  // idle
  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); download() }}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600 font-medium transition-colors"
      title="Guardar para usar sin conexión"
    >
      <Download className="w-3.5 h-3.5 flex-shrink-0" />
      <span>Sin conexión</span>
    </button>
  )
}
