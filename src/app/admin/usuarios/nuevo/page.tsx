import { createAdminClient } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import NuevoAdminForm from './NuevoAdminForm'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Nuevo administrador' }

export default async function NuevoAdminPage() {
  const admin = createAdminClient()
  const { data: colegios } = await admin
    .from('colegios')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5">
        <a href="/admin/usuarios" className="text-slate-400 text-sm hover:text-white flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Usuarios
        </a>
        <h1 className="text-xl font-bold text-white mt-1">Nuevo admin de colegio</h1>
      </div>
      <div className="px-6 py-6 max-w-md mx-auto">
        <NuevoAdminForm colegios={colegios ?? []} />
      </div>
    </div>
  )
}
