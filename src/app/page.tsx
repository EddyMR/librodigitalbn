import { createServerSupabaseClient } from '@/lib/supabase'
import ColegioSelector from '@/components/auth/ColegioSelector'
import type { Colegio } from '@/types'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: colegios } = await supabase
    .from('colegios')
    .select('id, codigo, nombre')
    .eq('activo', true)
    .order('nombre')

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo + branding */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-brand-600 flex items-center justify-center shadow-glow">
            <span className="text-4xl">✝</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Libro Digital Buena Nueva</h1>
            <p className="text-slate-500 text-sm mt-1">Selecciona tu colegio para continuar</p>
          </div>
        </div>

        {/* School selector card */}
        <div className="card p-6 space-y-4">
          <ColegioSelector colegios={(colegios as Colegio[]) ?? []} />
        </div>

        {/* Admin link */}
        <p className="text-center text-xs text-slate-400">
          ¿Administrador?{' '}
          <a href="/admin" className="text-brand-600 hover:underline font-medium">
            Acceder al panel
          </a>
        </p>
      </div>
    </main>
  )
}
