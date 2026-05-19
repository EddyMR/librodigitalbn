'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { User, Mail, KeyRound, Copy, Check, UserPlus, ShieldCheck } from 'lucide-react'
import { crearAlumno, crearCatequista, crearAdminColegio } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { Grupo, Perfil } from '@/types'

type Rol = 'alumno' | 'catequista' | 'admin_colegio'

interface FormData {
  nombre: string
  apellido: string
  email?: string
  grupoId?: string
}

interface Props {
  colegioId: string
  codigoColegio: string
  grupos: { id: string; nombre: string }[]
  catequistas: { id: string; nombre: string; apellido: string }[]
  rolDefault: string
  rolAdmin?: string
}

export default function NuevoUsuarioForm({ colegioId, codigoColegio, grupos, catequistas, rolDefault, rolAdmin }: Props) {
  const [rol, setRol] = useState<Rol>(rolDefault as Rol ?? 'alumno')
  const [result, setResult] = useState<{ username?: string; password?: string; email?: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>()

  async function onSubmit(data: FormData) {
    setLoading(true); setError('')

    if (rol === 'alumno') {
      if (!data.grupoId) { setError('Selecciona un grupo'); setLoading(false); return }
      const res = await crearAlumno({
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email || undefined,
        grupoId: data.grupoId,
        colegioId,
      })
      if (res.error) { setError(res.error); setLoading(false); return }
      setResult({ username: res.username, password: res.password, email: data.email })

    } else if (rol === 'catequista') {
      if (!data.email) { setError('El correo es requerido'); setLoading(false); return }
      const res = await crearCatequista({
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        colegioId,
      })
      if (res.error) { setError(res.error); setLoading(false); return }
      setResult({ email: data.email, password: res.password })

    } else {
      if (!data.email) { setError('El correo es requerido'); setLoading(false); return }
      const res = await crearAdminColegio({
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        colegioId,
      })
      if (res.error) { setError(res.error); setLoading(false); return }
      setResult({ email: data.email, password: res.password })
    }

    setLoading(false)
    reset()
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rolLabel: Record<Rol, string> = {
    alumno: 'alumno',
    catequista: 'catequista',
    admin_colegio: 'administrador',
  }

  if (result) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 flex items-center justify-center text-3xl">✓</div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">¡Usuario creado!</h2>
          <p className="text-slate-500 text-sm mt-1">Comparte estas credenciales con el usuario</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 text-left">
          {result.username && (
            <div>
              <p className="text-xs text-slate-400 font-medium">Usuario</p>
              <p className="font-mono font-bold text-slate-900">{result.username}</p>
            </div>
          )}
          {result.email && (
            <div>
              <p className="text-xs text-slate-400 font-medium">Correo</p>
              <p className="font-medium text-slate-900">{result.email}</p>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <div>
              <p className="text-xs text-slate-400 font-medium">Contraseña temporal</p>
              <p className="font-mono text-xl font-bold text-brand-700 tracking-widest">{result.password}</p>
            </div>
            <button
              onClick={() => handleCopy(`${result.username ? `Usuario: ${result.username}\n` : ''}${result.email ? `Correo: ${result.email}\n` : ''}Contraseña: ${result.password}`)}
              className="btn-secondary py-2 px-3"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setResult(null)} className="btn-secondary flex-1">
            Crear otro
          </button>
          <button onClick={() => router.push(`/${codigoColegio}/usuarios`)} className="btn-primary flex-1">
            Ver usuarios
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Role tabs — catequistas can only create alumnos */}
      {rolAdmin !== 'catequista' && (
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
          {(['alumno', 'catequista', 'admin_colegio'] as Rol[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRol(r)}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-medium transition-all',
                rol === r ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
              )}
            >
              {r === 'alumno' ? '👤 Alumno' : r === 'catequista' ? '✝️ Catequista' : '🛡️ Admin'}
            </button>
          ))}
        </div>
      )}

      {rol === 'admin_colegio' && (
        <div className="flex items-start gap-2.5 p-3 bg-purple-50 border border-purple-200 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-purple-700 leading-relaxed">
            El administrador podrá gestionar usuarios, grupos y ver el progreso del colegio, pero no podrá crear o modificar libros.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Nombre *</label>
          <input
            className={cn('input', errors.nombre && 'border-red-300 focus:ring-red-300')}
            placeholder="Ana"
            {...register('nombre', { required: true })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Apellido *</label>
          <input
            className={cn('input', errors.apellido && 'border-red-300 focus:ring-red-300')}
            placeholder="García"
            {...register('apellido', { required: true })}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">
          Correo electrónico {rol !== 'alumno' ? '*' : '(opcional)'}
        </label>
        <input
          className="input"
          type="email"
          placeholder="correo@ejemplo.com"
          {...register('email')}
        />
        {rol === 'alumno' && (
          <p className="text-xs text-slate-400">Si se agrega, recibirá sus credenciales por correo</p>
        )}
      </div>

      {/* Group selector (alumno only) */}
      {rol === 'alumno' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Grupo *</label>
          {grupos.length === 0 ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              No hay grupos creados. Crea un grupo primero.
            </div>
          ) : (
            <select className="input" {...register('grupoId', { required: rol === 'alumno' })}>
              <option value="">Seleccionar grupo...</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || (rol === 'alumno' && grupos.length === 0)}
        className="btn-primary w-full"
      >
        <UserPlus className="w-4 h-4" />
        {loading ? 'Creando...' : `Crear ${rolLabel[rol]}`}
      </button>
    </form>
  )
}
