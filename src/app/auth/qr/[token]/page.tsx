import { redirect } from 'next/navigation'
import { loginQR } from '@/lib/auth'

interface Props {
  params: Promise<{ token: string }>
}

export default async function QRLoginPage({ params }: Props) {
  const { token } = await params
  const result = await loginQR(token)

  if (result.error || !result.colegioCodigo) {
    redirect(`/?error=qr_invalido`)
  }

  // Redirect to magic link to establish session
  if (result.magicLink) {
    redirect(result.magicLink)
  }

  redirect(`/${result.colegioCodigo}/dashboard`)
}
