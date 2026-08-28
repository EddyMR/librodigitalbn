import { createServerSupabaseClient } from '@/lib/supabase'
import ColegioSelector from '@/components/auth/ColegioSelector'
import OfflineRedirect from '@/components/shared/OfflineRedirect'
import type { Colegio } from '@/types'

const avenir = "Avenir, 'Avenir Next', system-ui, sans-serif"

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: colegios } = await supabase
    .from('colegios')
    .select('id, codigo, nombre')
    .eq('activo', true)
    .order('nombre')

  return (
    <main
      className="min-h-dvh flex flex-col items-center"
      style={{ backgroundColor: '#32383c', fontFamily: avenir }}
    >
      <OfflineRedirect />
      {/* Columna centrada que contiene imagen + contenido */}
      <div className="w-full max-w-sm flex flex-col flex-1">

        {/* Imagen pegada al borde superior, sin espacio */}
        <img
          src="/images/home.png"
          alt=""
          className="w-full block"
          style={{ display: 'block' }}
        />

        {/* Contenido debajo de la imagen */}
        <div className="flex flex-col flex-1 justify-center px-5 py-8 gap-7">

          {/* Branding */}
          <div className="text-center">
            <h1
              className="text-white leading-none tracking-tight lowercase"
              style={{ fontSize: 76, fontWeight: 900, fontFamily: avenir }}
            >
              teresiano
            </h1>
            <p
              className="text-white/60 text-sm mt-3 leading-relaxed"
              style={{ fontFamily: avenir }}
            >
              <span className="font-bold italic">Buena Nueva</span>
              {' '}· programa de formación{' '}
              <span className="font-bold">preparatoria</span>
            </p>
          </div>

          {/* Selector */}
          <ColegioSelector colegios={(colegios as Colegio[]) ?? []} />

          {/* Admin link */}
          <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: avenir }}>
            <a href="/admin" className="hover:text-white/40 transition-colors">
              acceso administrador
            </a>
          </p>

        </div>
      </div>
    </main>
  )
}
