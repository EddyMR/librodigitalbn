import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import BottomNav from '@/components/layout/BottomNav'

interface Props {
  children: React.ReactNode
  params: Promise<{ colegio: string }>
}

export default async function AdminColegioLayout({ children, params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()

  if (!perfil) redirect(`/${codigo}/login`)
  // Cada página tiene su propia verificación de rol.
  // El layout permite cualquier usuario autenticado para que /perfil funcione para todos los roles.

  return (
    <div className="min-h-dvh bg-slate-50">
      <main className="max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav codigo={codigo} rol={perfil.rol} />
    </div>
  )
}
