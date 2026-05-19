import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import AdminSubidaMasivaClient from './AdminSubidaMasivaClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Subir alumnos masivo — Admin' }

export default async function AdminSubidaMasivaPage() {
  const admin = createAdminClient()

  const [{ data: colegios }, { data: grupos }] = await Promise.all([
    admin.from('colegios').select('id, nombre, codigo').eq('activo', true).order('nombre'),
    admin.from('grupos').select('id, nombre, colegio_id').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5">
        <a href="/admin/usuarios" className="text-slate-400 text-sm hover:text-white">← Usuarios</a>
        <h1 className="text-xl font-bold text-white mt-1">Subir alumnos masivo</h1>
        <p className="text-slate-400 text-sm">Selecciona un colegio y grupo, luego pega los nombres</p>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto">
        <AdminSubidaMasivaClient
          colegios={(colegios ?? []) as { id: string; nombre: string; codigo: string }[]}
          grupos={(grupos ?? []) as { id: string; nombre: string; colegio_id: string }[]}
        />
      </div>
    </div>
  )
}
