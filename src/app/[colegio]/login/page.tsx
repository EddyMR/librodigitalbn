import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase'
import LoginForm from '@/components/auth/LoginForm'
import type { Metadata } from 'next'

const avenir = "Avenir, 'Avenir Next', system-ui, sans-serif"

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
    <main
      className="min-h-dvh flex flex-col bg-white"
      style={{ fontFamily: avenir }}
    >
      <div className="w-full mx-auto flex flex-col flex-1 sm:max-w-sm">

        {/* ── Back link ── */}
        <div className="px-5 pt-5 pb-2">
          <a
            href="/"
            className="text-sm"
            style={{ color: '#055e97', fontFamily: avenir }}
          >
            ← Cambiar colegio
          </a>
        </div>

        {/* ── Branding ── */}
        <div className="px-5 pb-4 text-center">
          <h1
            className="leading-none lowercase tracking-tight"
            style={{ fontSize: 52, fontWeight: 900, color: '#1a3451', fontFamily: avenir }}
          >
            teresiano
          </h1>
          <p className="text-sm mt-1 leading-snug" style={{ color: '#555', fontFamily: avenir }}>
            <span className="font-bold italic">Buena Nueva</span>
            {' '}programa de formación{' '}
            <span className="font-bold">preparatoria</span>
          </p>
        </div>

        {/* ── Colegio name ── */}
        <div className="px-5 pb-5 text-center">
          <p
            className="font-bold text-lg leading-tight"
            style={{ color: '#1a3451', fontFamily: avenir }}
          >
            {colegio.nombre}
          </p>
          <p className="text-sm mt-0.5" style={{ color: '#888', fontFamily: avenir }}>
            Inicia sesión para continuar
          </p>
        </div>

        {/* ── Form card ── */}
        <div className="mx-4 flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <LoginForm codigoColegio={colegio.codigo} />
          </div>
        </div>

        <div className="h-8" />
      </div>
    </main>
  )
}
