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
    <main
      className="min-h-dvh flex flex-col overflow-hidden"
      style={{ backgroundColor: '#32383c' }}
    >
      {/* ── Photo collage ─────────────────────────────────────── */}
      <div className="flex items-end justify-center gap-2.5 pt-12 px-4">
        {/* Left – circle */}
        <div
          className="overflow-hidden flex-shrink-0 self-end"
          style={{ width: 112, height: 112, borderRadius: '50%' }}
        >
          <img
            src="/images/home-1.jpg"
            alt=""
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Middle – tall pill (extends highest) */}
        <div
          className="overflow-hidden flex-shrink-0"
          style={{ width: 124, height: 210, borderRadius: 80 }}
        >
          <img
            src="/images/home-2.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Right – rounded rectangle */}
        <div
          className="overflow-hidden flex-shrink-0 self-end"
          style={{ width: 134, height: 168, borderRadius: 28 }}
        >
          <img
            src="/images/home-3.jpg"
            alt=""
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>

      {/* ── Branding ──────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-1 text-center">
        <h1
          className="text-white leading-none tracking-tight lowercase"
          style={{ fontSize: 68, fontWeight: 900 }}
        >
          teresiano
        </h1>
        <p className="text-white/75 text-sm mt-1.5 leading-snug">
          <span className="font-bold italic">Buena Nueva</span>
          {' '}programa de formación{' '}
          <span className="font-bold">preparatoria</span>
        </p>
      </div>

      {/* ── Selector ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-5 mt-3">
        <ColegioSelector colegios={(colegios as Colegio[]) ?? []} />
      </div>

      {/* ── Admin link ────────────────────────────────────────── */}
      <p className="text-center text-xs pb-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
        <a href="/admin" className="hover:text-white/50 transition-colors">
          acceso administrador
        </a>
      </p>
    </main>
  )
}
