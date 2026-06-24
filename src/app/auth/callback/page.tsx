'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const next = searchParams.get('next') ?? '/'
    const code = searchParams.get('code')
    const supabase = createClient()

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? '/?error=auth' : next)
      })
      return
    }

    // Implicit flow: createBrowserClient auto-detects hash fragments on init
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        subscription.unsubscribe()
        router.replace(next)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        subscription.unsubscribe()
        router.replace(next)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-brand-50 to-white">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Iniciando sesión...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
