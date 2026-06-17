import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CiclosClient from './CiclosClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ciclos catequéticos' }

export default async function CiclosPage() {
  const admin = createAdminClient()

  const { data: ciclos } = await admin
    .from('ciclos')
    .select('id, nombre, descripcion, activo, orden, created_at')
    .order('orden', { ascending: false })

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5 flex items-center gap-4">
        <Link href="/admin/dashboard" className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Ciclos catequéticos</h1>
          <p className="text-slate-400 text-sm">Gestiona los años catequéticos de la plataforma</p>
        </div>
      </div>

      <CiclosClient initialCiclos={ciclos ?? []} />
    </div>
  )
}
