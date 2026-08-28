'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  getPendingEntregas,
  removeEntrega,
  countPending,
} from '@/lib/offline-queue'

export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [syncCurrent, setSyncCurrent] = useState(0)
  const [syncTotal, setSyncTotal] = useState(0)
  const syncingRef = useRef(false)
  const supabase = createClient()

  const syncPending = useCallback(async () => {
    if (syncingRef.current) return
    const pending = await getPendingEntregas()
    if (pending.length === 0) return

    syncingRef.current = true
    setSyncing(true)
    setSyncTotal(pending.length)
    setSyncCurrent(0)
    let syncedAny = false

    for (let i = 0; i < pending.length; i++) {
      const entry = pending[i]
      setSyncCurrent(i + 1)

      try {
        let contenido = entry.contenido

        // Handle offline drawing: data URL must be uploaded before upsert
        if (typeof contenido.dibujo_url === 'string' && (contenido.dibujo_url as string).startsWith('data:')) {
          let uploaded = false
          try {
            const blob = await fetch(contenido.dibujo_url as string).then(r => r.blob())
            const fd = new FormData()
            fd.append('file', new File([blob], 'dibujo.png', { type: 'image/png' }))
            fd.append('hoja_id', entry.hoja_id)
            fd.append('tipo', 'dibujo')
            const res = await fetch('/api/colegio/uploads', { method: 'POST', body: fd })
            if (res.ok) {
              const { url } = await res.json()
              contenido = { ...contenido, dibujo_url: url }
              uploaded = true
            }
          } catch {
            // Network error during upload — stop entire sync
            break
          }
          if (!uploaded) continue // Server error — skip this entry, try others
        }

        const { error } = await supabase.from('entregas').upsert(
          {
            alumno_id: entry.alumno_id,
            hoja_id: entry.hoja_id,
            contenido,
            estado: entry.estado,
            fecha_modificacion: entry.fecha_modificacion,
            ...(entry.fecha_entrega ? { fecha_entrega: entry.fecha_entrega } : {}),
          },
          { onConflict: 'alumno_id,hoja_id' }
        )

        if (!error) {
          await removeEntrega(entry.key)
          syncedAny = true
          window.dispatchEvent(
            new CustomEvent('entrega-synced', { detail: { hoja_id: entry.hoja_id } })
          )
        }
      } catch {
        // Red caída — dejar en cola, reintentar la próxima vez
        break
      }
    }

    syncingRef.current = false
    setSyncing(false)
    setSyncCurrent(0)
    setSyncTotal(0)
    const remaining = await countPending()
    setPendingCount(remaining)

    if (syncedAny && remaining === 0) {
      setJustSynced(true)
      setTimeout(() => setJustSynced(false), 3000)
    }
  }, [supabase])

  useEffect(() => {
    countPending().then(setPendingCount)

    function handleOnline() {
      setIsOnline(true)
      syncPending()
    }
    function handleOffline() {
      setIsOnline(false)
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        syncPending()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)

    if (navigator.onLine) syncPending()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [syncPending])

  return { pendingCount, syncing, justSynced, isOnline, syncCurrent, syncTotal }
}
