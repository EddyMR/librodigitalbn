import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'
import { avatarUrl, nombreCompleto, porcentaje } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, ChevronRight, Star } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Inicio' }

interface Props { params: Promise<{ colegio: string }> }

export default async function AlumnoInicio({ params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'alumno') redirect(`/${codigo}/login`)

  const admin = createAdminClient()

  // Step 1: get alumno's grupo_id (flat query, no nested join)
  const { data: gaData } = await admin
    .from('grupo_alumnos')
    .select('grupo_id')
    .eq('alumno_id', perfil.id)
    .single()

  const grupoId = gaData?.grupo_id ?? null

  // Step 2: fetch grupo details + libros + visitas in parallel
  const [grupoResult, librosResult, visitasResult] = await Promise.all([
    grupoId
      ? admin
          .from('grupos')
          .select('id, nombre, catequista:perfiles!grupos_catequista_id_fkey(nombre, apellido, avatar_id)')
          .eq('id', grupoId)
          .single()
      : Promise.resolve({ data: null }),

    grupoId
      ? admin
          .from('libro_grupos')
          .select('libro:libros(id, titulo, descripcion, portada_url, orden, bloques(id, hojas(id)))')
          .eq('grupo_id', grupoId)
          .eq('activo', true)
      : Promise.resolve({ data: [] }),

    createServerSupabaseClient().then(supabase =>
      supabase.from('visitas_hojas').select('hoja_id').eq('alumno_id', perfil.id)
    ),
  ])

  const grupo = grupoResult.data as any
  const libros = ((librosResult.data as any[])?.map((l: any) => l.libro) ?? [])
    .filter(Boolean)
    .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))

  const visitedHojaIds = new Set((visitasResult.data ?? []).map((v: any) => v.hoja_id))

  return (
    <div className="space-y-6 px-4 pt-4 pb-24">
      <div className="flex items-center gap-3">
        <Image
          src={avatarUrl(perfil.avatar_id)}
          alt="Avatar"
          width={52}
          height={52}
          className="rounded-2xl"
        />
        <div>
          <p className="text-sm text-slate-500">¡Bienvenido de vuelta!</p>
          <h1 className="text-xl font-bold text-slate-900">{nombreCompleto(perfil)}</h1>
        </div>
      </div>

      {grupo && (
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <Star className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Tu grupo</p>
            <p className="font-semibold text-slate-900">{grupo.nombre}</p>
            {grupo.catequista && (
              <p className="text-xs text-slate-500">
                Catequista: {nombreCompleto(grupo.catequista)}
              </p>
            )}
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-500" />
          Mis libros
        </h2>

        {libros.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-slate-400 text-sm">Aún no tienes libros asignados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {libros.map((libro: any) => {
              const totalHojas = libro.bloques?.flatMap((b: any) => b.hojas ?? []).length ?? 0
              const hojaIds = libro.bloques?.flatMap((b: any) => (b.hojas ?? []).map((h: any) => h.id)) ?? []
              const visitadas = hojaIds.filter((id: string) => visitedHojaIds.has(id)).length
              const pct = porcentaje(visitadas, totalHojas)

              return (
                <Link
                  key={libro.id}
                  href={`/${codigo}/libros/${libro.id}`}
                  className="card card-hover p-4 flex items-center gap-4 block"
                >
                  <div className="w-14 h-18 rounded-xl bg-brand-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {libro.portada_url ? (
                      <Image src={libro.portada_url} alt={libro.titulo} width={56} height={72} className="object-cover w-full h-full" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-brand-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="font-semibold text-slate-900 truncate">{libro.titulo}</p>
                      <p className="text-xs text-slate-400">{totalHojas} páginas</p>
                    </div>
                    <div className="space-y-1">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-400">{visitadas}/{totalHojas} páginas leídas</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
