import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import NuevoUsuarioForm from './NuevoUsuarioForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Nuevo usuario' }

interface Props {
  params: Promise<{ colegio: string }>
  searchParams: Promise<{ rol?: string }>
}

export default async function NuevoUsuarioPage({ params, searchParams }: Props) {
  const { colegio: codigo } = await params
  const { rol } = await searchParams
  const perfil = await getSession()
  if (!perfil || !['admin_colegio', 'catequista'].includes(perfil.rol)) redirect(`/${codigo}/login`)

  const admin = createAdminClient()

  let gruposQuery = admin
    .from('grupos')
    .select('id, nombre')
    .eq('colegio_id', perfil.colegio_id)
    .eq('activo', true)
    .order('nombre')

  // Catequistas can only assign to their own groups
  if (perfil.rol === 'catequista') {
    gruposQuery = gruposQuery.eq('catequista_id', perfil.id)
  }

  const { data: grupos } = await gruposQuery

  const { data: catequistas } = await admin
    .from('perfiles')
    .select('id, nombre, apellido')
    .eq('colegio_id', perfil.colegio_id)
    .eq('rol', 'catequista')
    .order('nombre')

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100 flex items-center gap-3">
        <Link href={`/${codigo}/usuarios`} className="text-brand-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Nuevo usuario</h1>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto">
        <div className="card p-5">
          <NuevoUsuarioForm
            colegioId={perfil.colegio_id}
            codigoColegio={codigo}
            grupos={(grupos ?? []) as any[]}
            catequistas={(catequistas ?? []) as any[]}
            rolDefault={rol ?? 'alumno'}
            rolAdmin={perfil.rol}
          />
        </div>
      </div>
    </div>
  )
}
