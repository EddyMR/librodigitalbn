import { createAdminClient } from '@/lib/supabase'
import CrearColegioForm from './CrearColegioForm'
import ColegiosListClient from './ColegiosListClient'
import { Building2 } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Colegios — Admin' }

export default async function ColegiosPage() {
  const admin = createAdminClient()

  const { data: colegios } = await admin
    .from('colegios')
    .select('id, codigo, nombre, activo, created_at')
    .order('nombre')

  const { data: counts } = await admin
    .from('perfiles')
    .select('colegio_id, rol')

  const countMap: Record<string, { alumnos: number; catequistas: number }> = {}
  for (const p of counts ?? []) {
    if (!countMap[p.colegio_id]) countMap[p.colegio_id] = { alumnos: 0, catequistas: 0 }
    if (p.rol === 'alumno') countMap[p.colegio_id].alumnos++
    if (p.rol === 'catequista') countMap[p.colegio_id].catequistas++
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5">
        <a href="/admin/dashboard" className="text-slate-400 text-sm hover:text-white">← Dashboard</a>
        <h1 className="text-xl font-bold text-white mt-1">Colegios</h1>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-500" />
            Agregar colegio
          </h2>
          <CrearColegioForm />
        </div>

        <ColegiosListClient colegios={colegios ?? []} countMap={countMap} />
      </div>
    </div>
  )
}
