'use client'

import { useSyncQueue } from '@/hooks/useSyncQueue'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SyncStatus() {
  const { pendingCount, syncing, justSynced, isOnline } = useSyncQueue()

  const visible = !isOnline || syncing || pendingCount > 0 || justSynced

  if (!visible) return null

  let bg = ''
  let content: React.ReactNode = null

  if (!isOnline) {
    bg = 'bg-amber-500'
    content = (
      <>
        <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Sin conexión
          {pendingCount > 0 && ` — ${pendingCount} respuesta${pendingCount > 1 ? 's' : ''} guardada${pendingCount > 1 ? 's' : ''} localmente`}
        </span>
      </>
    )
  } else if (syncing) {
    bg = 'bg-blue-500'
    content = (
      <>
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
        <span>Enviando respuestas guardadas...</span>
      </>
    )
  } else if (pendingCount > 0) {
    bg = 'bg-amber-500'
    content = (
      <>
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          {pendingCount} respuesta{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} de enviar
        </span>
      </>
    )
  } else if (justSynced) {
    bg = 'bg-emerald-500'
    content = (
      <>
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Respuestas enviadas correctamente</span>
      </>
    )
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'flex items-center justify-center gap-2',
        'py-2 px-4 text-xs font-semibold text-white',
        'transition-colors duration-300',
        bg
      )}
    >
      {content}
    </div>
  )
}
