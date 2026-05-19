'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { AVATARES } from '@/types'
import { Check } from 'lucide-react'
import type { Perfil } from '@/types'

interface FormData {
  mini_bio: string
}

interface Props {
  perfil: Perfil
}

export default function PerfilEditForm({ perfil }: Props) {
  const [selectedAvatar, setSelectedAvatar] = useState(perfil.avatar_id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: { mini_bio: perfil.mini_bio ?? '' },
  })
  const supabase = createClient()

  async function onSubmit(data: FormData) {
    setSaving(true)
    await supabase
      .from('perfiles')
      .update({ mini_bio: data.mini_bio, avatar_id: selectedAvatar })
      .eq('id', perfil.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Avatar picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Elige tu personaje</label>
        <div className="grid grid-cols-5 gap-2">
          {AVATARES.map(av => (
            <button
              key={av.id}
              type="button"
              onClick={() => setSelectedAvatar(av.id)}
              className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all
                ${selectedAvatar === av.id
                  ? 'border-brand-500 shadow-glow scale-105'
                  : 'border-transparent hover:border-brand-200'
                }`}
            >
              <Image src={av.src} alt={av.nombre} fill className="object-cover" />
              {selectedAvatar === av.id && (
                <div className="absolute inset-0 bg-brand-600/20 flex items-end justify-end p-1">
                  <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Mini biografía</label>
        <textarea
          className="input resize-none"
          rows={3}
          maxLength={160}
          placeholder="Cuéntanos algo sobre ti..."
          {...register('mini_bio')}
        />
        <p className="text-xs text-slate-400">Máximo 160 caracteres</p>
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saved ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}
