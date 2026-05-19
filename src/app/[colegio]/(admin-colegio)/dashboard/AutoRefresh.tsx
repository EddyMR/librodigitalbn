'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoRefresh() {
  const router = useRouter()
  useEffect(() => {
    router.refresh()
    const onFocus = () => router.refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])
  return null
}
