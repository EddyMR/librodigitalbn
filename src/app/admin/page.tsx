'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (data.ok) {
      router.push('/admin/dashboard')
    } else {
      setError('Contraseña incorrecta')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-slate-900">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-600 flex items-center justify-center mb-4">
            <span className="text-3xl">⚙️</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Panel General</h1>
          <p className="text-slate-400 text-sm mt-1">Acceso de administrador</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Contraseña de acceso</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600
                         text-white placeholder:text-slate-500 focus:outline-none
                         focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
              placeholder="••••••••"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading || !password}
            className="btn-primary w-full"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>

        <p className="text-center">
          <a href="/" className="text-slate-500 hover:text-slate-300 text-sm">← Volver al inicio</a>
        </p>
      </div>
    </main>
  )
}
