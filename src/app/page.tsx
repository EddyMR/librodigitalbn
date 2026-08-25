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

        {/* ── Photo collage – three vertical ovals ─────────────── */}
        <div className="flex items-end justify-center gap-2 pt-10 px-4">
          {/* Left oval – shorter, bottom-aligned */}
          <div
            className="overflow-hidden flex-shrink-0"
            style={{ width: 108, height: 170, borderRadius: 999 }}
          >
            <img
              src="/images/home-1.jpg"
              alt=""
              className="w-full h-full object-cover object-top"
            />
          </div>

          {/* Middle oval – tallest */}
          <div
            className="overflow-hidden flex-shrink-0"
            style={{ width: 116, height: 220, borderRadius: 999 }}
          >
            <img
              src="/images/home-2.jpg"
              alt=""
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Right oval – medium */}
          <div
            className="overflow-hidden flex-shrink-0"
            style={{ width: 108, height: 190, borderRadius: 999 }}
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
