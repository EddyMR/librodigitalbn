'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Already dismissed by user
    if (localStorage.getItem('pwa-install-dismissed')) return

    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((window.navigator as any).standalone === true) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent)

    if (ios && isSafari) {
      setIsIOS(true)
      setVisible(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    const onInstalled = () => {
      setVisible(false)
      localStorage.setItem('pwa-install-dismissed', '1')
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function handleDismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setVisible(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') {
      setVisible(false)
      localStorage.setItem('pwa-install-dismissed', '1')
    }
  }

  if (!visible) return null

  return (
    <div className="w-full bg-brand-600 text-white px-4 py-2.5 flex items-center gap-3 shrink-0">
      {isIOS ? (
        <Share className="w-4 h-4 flex-shrink-0 opacity-90" />
      ) : (
        <Download className="w-4 h-4 flex-shrink-0 opacity-90" />
      )}

      <p className="flex-1 text-sm font-medium leading-tight">
        {isIOS
          ? <>Instala la app: toca <strong>Compartir</strong> → <strong>"Añadir a inicio"</strong></>
          : 'Instala la app para acceder más rápido'}
      </p>

      {!isIOS && (
        <button
          onClick={handleInstall}
          className="text-xs font-bold bg-white text-brand-700 px-3 py-1 rounded-lg flex-shrink-0 hover:bg-brand-50 transition-colors"
        >
          Instalar
        </button>
      )}

      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg hover:bg-brand-500 transition-colors flex-shrink-0"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
