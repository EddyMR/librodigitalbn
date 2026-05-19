'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, QrCode, User, Mail } from 'lucide-react'
import { loginAlumno, loginEmail } from '@/lib/auth'
import { cn } from '@/lib/utils'

type Tab = 'alumno' | 'catequista'

interface AlumnoForm { username: string; password: string }
interface EmailForm { email: string; password: string }

export default function LoginForm({ codigoColegio }: { codigoColegio: string }) {
  const [tab, setTab] = useState<Tab>('alumno')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const alumnoForm = useForm<AlumnoForm>()
  const emailForm = useForm<EmailForm>()

  async function onAlumnoSubmit(data: AlumnoForm) {
    setLoading(true); setError(null)
    const res = await loginAlumno(codigoColegio, data.username, data.password)
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push(`/${codigoColegio}/inicio`)
  }

  async function onEmailSubmit(data: EmailForm) {
    setLoading(true); setError(null)
    const res = await loginEmail(data.email, data.password)
    if (res.error) { setError(res.error); setLoading(false); return }
    const colegio = res.colegioCodigo ?? codigoColegio
    if (res.rol === 'catequista') {
      router.push(`/${colegio}/grupo`)
    } else {
      router.push(`/${colegio}/dashboard`)
    }
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
        {[
          { key: 'alumno' as Tab, label: 'Alumno', icon: User },
          { key: 'catequista' as Tab, label: 'Catequista / Admin', icon: Mail },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(null) }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Alumno form */}
      {tab === 'alumno' && (
        <form onSubmit={alumnoForm.handleSubmit(onAlumnoSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Usuario</label>
            <input
              className="input"
              placeholder="nombre.apellido"
              autoCapitalize="none"
              autoCorrect="off"
              {...alumnoForm.register('username', { required: true })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Contraseña</label>
            <div className="relative">
              <input
                className="input pr-11"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••"
                autoCapitalize="none"
                {...alumnoForm.register('password', { required: true })}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {/* QR option */}
          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">o</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <a
            href={`/${codigoColegio}/login/qr`}
            className="btn-secondary w-full"
          >
            <QrCode className="w-4 h-4" />
            Entrar con código QR
          </a>
        </form>
      )}

      {/* Catequista / Admin form */}
      {tab === 'catequista' && (
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Correo electrónico</label>
            <input
              className="input"
              type="email"
              placeholder="tu@correo.com"
              {...emailForm.register('email', { required: true })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Contraseña</label>
            <div className="relative">
              <input
                className="input pr-11"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                {...emailForm.register('password', { required: true })}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      )}
    </div>
  )
}
