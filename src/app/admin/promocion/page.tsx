import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PromocionClient from './PromocionClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Promoción de alumnos' }

export default async function PromocionPage() {
  const admin = createAdminClient()

  const [{ data: ciclos }, { data: colegios }] = await Promise.all([
    admin
      .from('ciclos')
      .select('id, nombre, activo')
      .order('orden', { ascending: false }),
    admin
      .from('colegios')
      .select('id, nombre, codigo')
      .eq('activo', true)
      .order('nombre'),
  ])

  return (
    <div className="min-h-dvh bg-slate-50 pb-10">
      <div className="bg-slate-900 px-6 py-5 flex items-center gap-4">
        <Link href="/admin/dashboard" className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Promoción de alumnos</h1>
          <p className="text-slate-400 text-sm">Mueve alumnos de un ciclo a otro conservando su historial</p>
        </div>
      </div>

      <PromocionClient
        ciclos={ciclos ?? []}
        colegios={colegios ?? []}
      />
    </div>
  )
}
