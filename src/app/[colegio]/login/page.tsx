import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ colegio: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { colegio: codigo } = await params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('colegios').select('nombre').eq('codigo', codigo).single()
  return { title: data?.nombre ?? 'Iniciar sesión' }
}

export default async function LoginPage({ params }: Props) {
  const { colegio: codigo } = await params
  const supabase = await createServerSupabaseClient()

  const { data: colegio } = await supabase
    .from('colegios')
    .select('id, codigo, nombre')
    .eq('codigo', codigo.toUpperCase())
    .eq('activo', true)
    .single()

  if (!colegio) notFound()

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <a href="/" className="inline-block text-brand-400 text-sm hover:text-brand-600 mb-2">
            ← Cambiar colegio
          </a>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-600 flex items-center justify-center shadow-glow">
            <span className="text-3xl">✝</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 pt-2">{colegio.nombre}</h1>
          <p className="text-sm text-slate-500">Inicia sesión para continuar</p>
        </div>

        {/* Login form */}
        <div className="card p-6">
          <LoginForm codigoColegio={colegio.codigo} />
        </div>
      </div>
    </main>
  )
}
