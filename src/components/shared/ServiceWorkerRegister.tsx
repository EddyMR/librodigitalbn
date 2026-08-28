'use client'

import { useEffect } from 'react'

/**
 * Registers the next-pwa service worker.
 *
 * next-pwa's own `register: true` injects its registration code into the
 * Pages Router entry chunk (`main-*.js`), which the App Router never loads —
 * so the SW silently never registered. We register it explicitly here instead.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    // sw.js only exists in production builds (next-pwa is disabled in dev)
    if (process.env.NODE_ENV !== 'production') return

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    }

    // Don't compete with the page's own resources for bandwidth on first paint
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
