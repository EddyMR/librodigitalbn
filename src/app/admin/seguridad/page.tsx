import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import SeguridadClient from './SeguridadClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Seguridad' }

export default async function SeguridadPage() {
  const supabase = createAdminClient()
  const { data: passwords } = await supabase
    .from('admin_passwords')
    .select('id, etiqueta, created_at')
    .eq('activo', true)
    .order('created_at', { ascending: true })

  const list = passwords ?? []

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/admin/dashboard" className="text-brand-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 flex-1">Contraseñas del panel</h1>
      </div>

      <SeguridadClient initialPasswords={list} />
    </div>
  )
}
