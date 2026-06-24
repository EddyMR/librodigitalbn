import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import { QrCode } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ colegio: string }> }

export default async function LoginQRInfoPage({ params }: Props) {
  const { colegio: codigo } = await params
  const admin = createAdminClient()
  const { data: col } = await admin
    .from('colegios')
    .select('nombre, codigo')
    .eq('codigo', codigo.toUpperCase())
    .eq('activo', true)
    .single()

  if (!col) notFound()

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-600 flex items-center justify-center shadow-glow">
          <QrCode className="w-8 h-8 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">Iniciar con código QR</h1>
          <p className="text-sm text-slate-500">
            Pide a tu catequista que genere un código QR desde tu perfil. Al escanearlo con la cámara del celular entrarás automáticamente.
          </p>
        </div>
        <a href={`/${col.codigo}/login`} className="btn-primary block w-full text-center">
          ← Volver al inicio de sesión
        </a>
      </div>
    </main>
  )
}
