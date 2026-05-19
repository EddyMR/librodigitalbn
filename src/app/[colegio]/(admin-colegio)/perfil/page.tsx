import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { avatarUrl, nombreCompleto, labelRol } from '@/lib/utils'
import Image from 'next/image'
import PerfilEditForm from '@/components/perfil/PerfilEditForm'
import CambiarContrasenaForm from '@/components/perfil/CambiarContrasenaForm'
import LogoutButton from '@/components/auth/LogoutButton'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mi perfil' }

interface Props { params: Promise<{ colegio: string }> }

export default async function PerfilPage({ params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()
  if (!perfil) redirect(`/${codigo}/login`)

  return (
    <div className="space-y-6 px-4 pt-4 pb-24">
      <div className="text-center space-y-3">
        <div className="relative inline-block">
          <Image
            src={avatarUrl(perfil.avatar_id)}
            alt="Tu avatar"
            width={96}
            height={96}
            className="rounded-3xl shadow-card"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{nombreCompleto(perfil)}</h1>
          <span className={`badge mt-1 ${
            perfil.rol === 'catequista' ? 'bg-gold-100 text-gold-800' :
            perfil.rol === 'admin_colegio' ? 'bg-purple-100 text-purple-800' :
            'bg-brand-100 text-brand-800'
          }`}>
            {labelRol(perfil.rol)}
          </span>
        </div>
        {perfil.mini_bio && (
          <p className="text-slate-500 text-sm max-w-xs mx-auto italic">"{perfil.mini_bio}"</p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Editar perfil</h2>
        <PerfilEditForm perfil={perfil} />
      </div>

      {perfil.username && (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500">
            @
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Tu usuario</p>
            <p className="font-mono font-semibold text-slate-800">{perfil.username}</p>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Cambiar contraseña</h2>
        <CambiarContrasenaForm />
      </div>

      <div className="card p-2">
        <LogoutButton />
      </div>
    </div>
  )
}
