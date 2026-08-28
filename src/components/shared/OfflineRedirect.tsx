'use client'

import { useEffect } from 'react'

/**
 * Mounted on the root "/" page. When offline, jumps straight to a downloaded
 * page — skipping the login/inicio chain, which needs network. Never runs
 * while online, so the normal flow is untouched.
 *
 * Mirrors the logic in public/offline.html, which is the PWA's start_url.
 */
export default function OfflineRedirect() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || navigator.onLine) return
    if (typeof caches === 'undefined') return

    let cancelled = false

    let saved: string | null = null
    try { saved = localStorage.getItem('offline-last-book') } catch {}

    // Only ever redirect somewhere that is actually cached — an uncached URL
    // is a dead end offline. Preference: last libro > any libro > any hoja.
    caches.open('hoja-pages')
      .then(cache => cache.keys())
      .then(keys => {
        let libro: string | null = null
        let hoja: string | null = null
        for (const req of keys) {
          let path: string
          try { path = new URL(req.url).pathname } catch { continue }
          const parts = path.split('/').filter(Boolean)
          if (parts[1] !== 'libros') continue
          if (parts.length === 3) {
            if (saved && path === saved) { libro = saved; break }
            if (!libro) libro = path
          } else if (parts.length === 5 && !hoja) {
            hoja = path
          }
        }
        const target = libro || hoja
        if (target && !cancelled) window.location.replace(target)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [])

  return null
}
