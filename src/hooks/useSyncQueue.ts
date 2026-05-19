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
  const syncingRef = useRef(false)
  const supabase = createClient()

  const syncPending = useCallback(async () => {
    // Evitar ejecuciones simultáneas
    if (syncingRef.current) return
    const pending = await getPendingEntregas()
    if (pending.length === 0) return

    syncingRef.current = true
    setSyncing(true)
    let syncedAny = false

    for (const entry of pending) {
      try {
        const { error } = await supabase.from('entregas').upsert(
          {
            alumno_id: entry.alumno_id,
            hoja_id: entry.hoja_id,
            contenido: entry.contenido,
            estado: entry.estado,
            fecha_modificacion: entry.fecha_modificacion,
            ...(entry.fecha_entrega ? { fecha_entrega: entry.fecha_entrega } : {}),
          },
          { onConflict: 'alumno_id,hoja_id' }
        )

        if (!error) {
          await removeEntrega(entry.key)
          syncedAny = true
          // Avisar al HojaViewer activo que esta hoja ya fue sincronizada
          window.dispatchEvent(
            new CustomEvent('entrega-synced', { detail: { hoja_id: entry.hoja_id } })
          )
        }
      } catch {
        // Error de red — dejar en cola, reintentar la próxima vez
        break
      }
    }

    syncingRef.current = false
    setSyncing(false)
    const remaining = await countPending()
    setPendingCount(remaining)

    if (syncedAny && remaining === 0) {
      setJustSynced(true)
      setTimeout(() => setJustSynced(false), 3000)
    }
  }, [supabase])

  useEffect(() => {
    // Cargar conteo inicial al montar
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

    // Sincronizar al montar si hay conexión (por si venía de offline)
    if (navigator.onLine) syncPending()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [syncPending])

  return { pendingCount, syncing, justSynced, isOnline }
}
