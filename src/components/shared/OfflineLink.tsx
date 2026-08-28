'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof Link>

/**
 * Drop-in replacement for Next.js Link that forces a full navigation when offline.
 * Online: normal SPA navigation (router.push via Next.js Link).
 * Offline: window.location.href so the SW can serve the page from cache.
 */
export default function OfflineLink({ onClick, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={e => {
        if (!navigator.onLine) {
          e.preventDefault()
          window.location.href = props.href as string
          return
        }
        onClick?.(e)
      }}
    />
  )
}
