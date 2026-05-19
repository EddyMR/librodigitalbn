import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import BottomNav from '@/components/layout/BottomNav'
import SyncStatus from '@/components/offline/SyncStatus'

interface Props {
  children: React.ReactNode
  params: Promise<{ colegio: string }>
}

export default async function AlumnoLayout({ children, params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()

  if (!perfil) redirect(`/${codigo}/login`)
  if (perfil.rol === 'catequista') redirect(`/${codigo}/grupo`)
  if (perfil.rol === 'admin_colegio') redirect(`/${codigo}/dashboard`)
  if (perfil.rol !== 'alumno') redirect(`/${codigo}/login`)

  return (
    <div className="min-h-dvh bg-slate-50">
      <SyncStatus />
      <main className="max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav codigo={codigo} rol="alumno" />
    </div>
  )
}
