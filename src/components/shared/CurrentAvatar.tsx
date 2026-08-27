'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Props {
  serverAvatarId: number
  size: number
  className?: string
}

export const AVATAR_STORAGE_KEY = 'avatar_id_current'

export default function CurrentAvatar({ serverAvatarId, size, className = '' }: Props) {
  const [avatarId, setAvatarId] = useState(serverAvatarId)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AVATAR_STORAGE_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed > 0) setAvatarId(parsed)
      }
    } catch {}

    function onStorage(e: StorageEvent) {
      if (e.key === AVATAR_STORAGE_KEY && e.newValue) {
        const parsed = parseInt(e.newValue, 10)
        if (!isNaN(parsed) && parsed > 0) setAvatarId(parsed)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <Image
      src={`/avatars/avatar-${avatarId}.png`}
      alt="Avatar"
      width={size}
      height={size}
      className={className}
    />
  )
}
