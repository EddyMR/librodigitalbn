import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

interface Props { params: Promise<{ colegio: string }> }

export default async function DashboardRedirect({ params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()

  if (!perfil) redirect(`/${codigo}/login`)

  // Route to role-specific dashboard
  switch (perfil.rol) {
    case 'alumno':
      redirect(`/${codigo}/dashboard`)
    case 'catequista':
      redirect(`/${codigo}/dashboard`)
    case 'admin_colegio':
      redirect(`/${codigo}/dashboard`)
    default:
      redirect(`/${codigo}/login`)
  }
}
