import { createServerSupabaseClient } from '@/lib/supabase'
import ColegioSelector from '@/components/auth/ColegioSelector'
import type { Colegio } from '@/types'

const avenir = "'Avenir Next', 'Avenir', 'Nunito', system-ui, sans-serif"

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: colegios } = await supabase
    .from('colegios')
    .select('id, codigo, nombre')
    .eq('activo', true)
    .order('nombre')

  return (
    <main
      className="min-h-dvh flex flex-col"
      style={{ backgroundColor: '#32383c', fontFamily: avenir }}
    >
      {/* ── Centered column (full width on mobile, capped on desktop) ── */}
      <div className="w-full mx-auto flex flex-col flex-1 sm:max-w-sm sm:justify-center sm:py-12">

        {/* ── Photo collage – tall ovals bleeding from top edge ─── */}
        {/* overflow-hidden clips the tops, items-end aligns bottoms, marginBottom staggers heights */}
        <div className="flex items-end justify-center gap-2 overflow-hidden" style={{ height: 300 }}>
          {/* Left oval – ends 40px above bottom */}
          <div
            className="overflow-hidden flex-shrink-0"
            style={{ width: 106, height: 460, borderRadius: 999, marginBottom: 40, backgroundColor: '#32383c' }}
          >
            <img
              src="/images/home-1.jpg"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>

          {/* Middle oval – reaches the bottom edge */}
          <div
            className="overflow-hidden flex-shrink-0"
            style={{ width: 114, height: 500, borderRadius: 999, marginBottom: 0, backgroundColor: '#32383c' }}
          >
            <img
              src="/images/home-2.jpg"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>

          {/* Right oval – ends 20px above bottom */}
          <div
            className="overflow-hidden flex-shrink-0"
            style={{ width: 106, height: 480, borderRadius: 999, marginBottom: 20, backgroundColor: '#32383c' }}
          >
            <img
              src="/images/home-3.jpg"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* ── Branding ──────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-1 text-center">
          <h1
            className="text-white leading-none tracking-tight lowercase"
            style={{ fontSize: 68, fontWeight: 900, fontFamily: avenir }}
          >
            teresiano
          </h1>
          <p
            className="text-white/75 text-sm mt-1.5 leading-snug"
            style={{ fontFamily: avenir }}
          >
            <span className="font-bold italic">Buena Nueva</span>
            {' '}programa de formación{' '}
            <span className="font-bold">preparatoria</span>
          </p>
        </div>

        {/* ── Selector ──────────────────────────────────────────── */}
        <div className="px-5 mt-5">
          <ColegioSelector colegios={(colegios as Colegio[]) ?? []} />
        </div>

        {/* ── Admin link ────────────────────────────────────────── */}
        <p className="text-center text-xs py-6" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: avenir }}>
          <a href="/admin" className="hover:text-white/50 transition-colors">
            acceso administrador
          </a>
        </p>

      </div>
    </main>
  )
}
