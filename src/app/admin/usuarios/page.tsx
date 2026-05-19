import { createAdminClient } from '@/lib/supabase'
import { Users, Upload } from 'lucide-react'
import Link from 'next/link'
import AdminUsuariosClient from './AdminUsuariosClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Usuarios — Admin' }

interface Props {
  searchParams: Promise<{ rol?: string }>
}

export default async function AdminUsuariosPage({ searchParams }: Props) {
  const { rol } = await searchParams
  const admin = createAdminClient()

  const { data: usuarios } = await admin
    .from('perfiles')
    .select('*, colegio:colegios(nombre, codigo)')
    .in('rol', ['admin_colegio', 'catequista', 'alumno'])
    .order('rol')
    .order('nombre')

  const { data: colegios } = await admin
    .from('colegios')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')

  const totales = {
    admins: (usuarios ?? []).filter((u: any) => u.rol === 'admin_colegio').length,
    catequistas: (usuarios ?? []).filter((u: any) => u.rol === 'catequista').length,
    alumnos: (usuarios ?? []).filter((u: any) => u.rol === 'alumno').length,
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5">
        <a href="/admin/dashboard" className="text-slate-400 text-sm hover:text-white">← Dashboard</a>
        <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
          <Users className="w-5 h-5" /> Usuarios del sistema
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">
          {totales.admins} administradores · {totales.catequistas} catequistas · {totales.alumnos} alumnos
        </p>
      </div>

      <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
        <Link
          href="/admin/usuarios/masivo"
          className="flex items-center gap-3 p-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors"
        >
          <Upload className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Subir alumnos masivo</p>
            <p className="text-xs text-teal-100">Pega una lista y asígnalos a un colegio y grupo</p>
          </div>
        </Link>
        <AdminUsuariosClient
          usuarios={(usuarios ?? []) as any[]}
          colegios={(colegios ?? []) as any[]}
          rolFiltro={rol ?? ''}
        />
      </div>
    </div>
  )
}
