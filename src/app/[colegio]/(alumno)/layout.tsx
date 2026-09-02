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

  // Catequistas y administradores pueden entrar aquí para ver el libro tal
  // como lo ve el alumno. No es un agujero: las páginas de libro solo pasan
  // `alumnoId` cuando el perfil es alumno, y sin él HojaViewer no escribe nada
  // ni muestra ningún control. Y /inicio se protege por su cuenta.
  if (perfil.rol !== 'alumno' && perfil.rol !== 'catequista' && perfil.rol !== 'admin_colegio') {
    redirect(`/${codigo}/login`)
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      {perfil.rol === 'alumno' && <SyncStatus />}
      <main className="max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav codigo={codigo} rol={perfil.rol} />
    </div>
  )
}
