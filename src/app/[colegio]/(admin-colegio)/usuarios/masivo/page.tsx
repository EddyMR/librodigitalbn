import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import SubidaMasivaClient from './SubidaMasivaClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Subir alumnos masivo' }

interface Props { params: Promise<{ colegio: string }> }

export default async function SubidaMasivaPage({ params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'admin_colegio') redirect(`/${codigo}/login`)

  const admin = createAdminClient()

  const { data: grupos } = await admin
    .from('grupos')
    .select('id, nombre')
    .eq('colegio_id', perfil.colegio_id)
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100 flex items-center gap-3">
        <Link href={`/${codigo}/usuarios`} className="text-brand-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Subir alumnos</h1>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto">
        <SubidaMasivaClient
          grupos={(grupos ?? []) as { id: string; nombre: string }[]}
          colegioId={perfil.colegio_id}
          codigoColegio={codigo}
          colegioNombre={perfil.colegio?.nombre ?? ''}
        />
      </div>
    </div>
  )
}
