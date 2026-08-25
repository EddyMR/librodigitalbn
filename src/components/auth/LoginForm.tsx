'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, QrCode } from 'lucide-react'
import { loginAlumno, loginEmail } from '@/lib/auth'

const avenir = "Avenir, 'Avenir Next', system-ui, sans-serif"

const C = {
  alumno:      '#ffb600',
  catequista:  '#89af42',
  navy:        '#1a3451',
  blue:        '#055e97',
}

type Tab = 'alumno' | 'catequista'
interface AlumnoForm { username: string; password: string }
interface EmailForm  { email: string;    password: string }

export default function LoginForm({ codigoColegio }: { codigoColegio: string }) {
  const [tab, setTab]     = useState<Tab>('alumno')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const alumnoForm = useForm<AlumnoForm>()
  const emailForm  = useForm<EmailForm>()

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
    router.push(res.rol === 'catequista' ? `/${colegio}/grupo` : `/${colegio}/dashboard`)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    fontSize: 14,
    fontFamily: avenir,
    outline: 'none',
    color: '#1a3451',
    backgroundColor: '#fff',
  }

  return (
    <div style={{ fontFamily: avenir }}>

      {/* ── Role tabs ── */}
      <div className="flex gap-2 mb-5">
        {([
          { key: 'alumno'     as Tab, label: 'Alumno',           color: C.alumno },
          { key: 'catequista' as Tab, label: 'Catequista / admin', color: C.catequista },
        ] as const).map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(null) }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity"
            style={{
              backgroundColor: color,
              color: '#fff',
              fontFamily: avenir,
              opacity: tab === key ? 1 : 0.45,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#fff0f0', color: '#c0392b', border: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}

      {/* ── Alumno form ── */}
      {tab === 'alumno' && (
        <form onSubmit={alumnoForm.handleSubmit(onAlumnoSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: '#334155', fontFamily: avenir }}>
              Usuario
            </label>
            <input
              style={inputStyle}
              placeholder="nombre.apellido"
              autoCapitalize="none"
              autoCorrect="off"
              {...alumnoForm.register('username', { required: true })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: '#334155', fontFamily: avenir }}>
              Contraseña
            </label>
            <div className="relative">
              <input
                style={{ ...inputStyle, paddingRight: 44 }}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••"
                {...alumnoForm.register('password', { required: true })}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#94a3b8' }}
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base transition-opacity"
            style={{ backgroundColor: C.navy, fontFamily: avenir, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Entrando...' : 'entrar'}
          </button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">o</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <a
            href={`/${codigoColegio}/login/qr`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold text-base"
            style={{ backgroundColor: C.blue, fontFamily: avenir }}
          >
            <QrCode className="w-4 h-4" />
            entrar con código QR
          </a>
        </form>
      )}

      {/* ── Catequista form ── */}
      {tab === 'catequista' && (
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: '#334155', fontFamily: avenir }}>
              Correo electrónico
            </label>
            <input
              style={inputStyle}
              type="email"
              placeholder="tu@correo.com"
              {...emailForm.register('email', { required: true })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: '#334155', fontFamily: avenir }}>
              Contraseña
            </label>
            <div className="relative">
              <input
                style={{ ...inputStyle, paddingRight: 44 }}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                {...emailForm.register('password', { required: true })}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#94a3b8' }}
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base transition-opacity"
            style={{ backgroundColor: C.navy, fontFamily: avenir, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Entrando...' : 'entrar'}
          </button>
        </form>
      )}
    </div>
  )
}
