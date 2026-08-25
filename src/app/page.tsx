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

        {/* ── Photo collage – tall ovals from top edge ─────────── */}
        <div className="flex items-end justify-center gap-2 overflow-hidden" style={{ height: 290 }}>
          {/* Left oval */}
          <div
            className="flex-shrink-0 relative overflow-hidden"
            style={{ width: 160, height: 400, borderRadius: 999, backgroundColor: '#32383c' }}
          >
            <img
              src="/images/home-1.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ transform: 'scale(0.72)', transformOrigin: 'center center' }}
            />
          </div>

          {/* Middle oval – tallest, no margin = reaches bottom */}
          <div
            className="flex-shrink-0 relative overflow-hidden"
            style={{ width: 168, height: 460, borderRadius: 999, backgroundColor: '#32383c' }}
          >
            <img
              src="/images/home-2.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ transform: 'scale(0.72)', transformOrigin: 'center center' }}
            />
          </div>

          {/* Right oval */}
          <div
            className="flex-shrink-0 relative overflow-hidden"
            style={{ width: 160, height: 430, borderRadius: 999, marginBottom: 25, backgroundColor: '#32383c' }}
          >
            <img
              src="/images/home-3.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ transform: 'scale(0.72)', transformOrigin: 'center center' }}
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
