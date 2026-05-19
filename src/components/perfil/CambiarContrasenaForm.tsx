'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CambiarContrasenaForm() {
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showNueva, setShowNueva] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  const noCoinciden = confirmar.length > 0 && nueva !== confirmar
  const muyCortа = nueva.length > 0 && nueva.length < 6
  const canSubmit = nueva.length >= 6 && nueva === confirmar

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password: nueva })
    setLoading(false)

    if (error) {
      setError(error.message === 'New password should be different from the old password.'
        ? 'La nueva contraseña debe ser diferente a la actual.'
        : 'No se pudo cambiar la contraseña. Intenta de nuevo.')
      return
    }

    setSaved(true)
    setNueva('')
    setConfirmar('')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Contraseña actualizada correctamente
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Nueva contraseña</label>
        <div className="relative">
          <input
            type={showNueva ? 'text' : 'password'}
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className={cn(
              'input pr-10',
              muyCortа && 'border-red-300 focus:ring-red-200'
            )}
          />
          <button
            type="button"
            onClick={() => setShowNueva(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {muyCortа && <p className="text-xs text-red-500">Mínimo 6 caracteres</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Confirmar contraseña</label>
        <div className="relative">
          <input
            type={showConfirmar ? 'text' : 'password'}
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            placeholder="Repite la contraseña"
            className={cn(
              'input pr-10',
              noCoinciden && 'border-red-300 focus:ring-red-200'
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmar(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {noCoinciden && <p className="text-xs text-red-500">Las contraseñas no coinciden</p>}
      </div>

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all',
          canSubmit && !loading
            ? 'bg-brand-600 hover:bg-brand-700 text-white'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        )}
      >
        <KeyRound className="w-4 h-4" />
        {loading ? 'Cambiando...' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}
