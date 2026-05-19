import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AdminGruposClient from './AdminGruposClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Grupos' }

interface Props { searchParams: Promise<{ colegio?: string }> }

export default async function AdminGruposPage({ searchParams }: Props) {
  const { colegio: colegioId } = await searchParams
  const admin = createAdminClient()

  const { data: colegios } = await admin
    .from('colegios')
    .select('id, nombre, codigo')
    .eq('activo', true)
    .order('nombre')

  if (!colegioId) {
    return (
      <div className="min-h-dvh bg-slate-50">
        <div className="bg-slate-900 px-6 py-5 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Grupos</h1>
            <p className="text-slate-400 text-sm">Selecciona un colegio</p>
          </div>
        </div>
        <div className="px-6 py-6 max-w-2xl mx-auto space-y-3">
          {(colegios ?? []).map(c => (
            <Link
              key={c.id}
              href={`/admin/grupos?colegio=${c.id}`}
              className="card card-hover p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-700 font-bold text-sm">{c.codigo.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{c.nombre}</p>
                <p className="text-xs text-slate-400 font-mono">{c.codigo}</p>
              </div>
              <span className="text-slate-400 text-sm">Ver grupos →</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const colegio = (colegios ?? []).find(c => c.id === colegioId)

  const [
    { data: grupos },
    { data: catequistas },
    { data: libros },
    { data: alumnos },
    { data: libroGruposData },
  ] = await Promise.all([
    admin
      .from('grupos')
      .select(`
        id, nombre, activo, created_at,
        catequista:perfiles!grupos_catequista_id_fkey(id, nombre, apellido, avatar_id),
        grupo_alumnos(alumno_id)
      `)
      .eq('colegio_id', colegioId)
      .order('nombre'),

    admin
      .from('perfiles')
      .select('id, nombre, apellido, avatar_id')
      .eq('colegio_id', colegioId)
      .eq('rol', 'catequista')
      .eq('activo', true)
      .order('nombre'),

    admin
      .from('libros')
      .select('id, titulo, portada_url')
      .eq('activo', true)
      .order('orden'),

    admin
      .from('perfiles')
      .select('id, nombre, apellido, avatar_id, activo, grupo_alumnos(grupo_id, grupo:grupos(id, nombre))')
      .eq('colegio_id', colegioId)
      .eq('rol', 'alumno')
      .order('nombre'),

    admin
      .from('libro_grupos')
      .select('grupo_id, libro_id')
      .eq('activo', true),
  ])

  const libroCountMap: Record<string, number> = {}
  for (const lg of libroGruposData ?? []) {
    if (!libroCountMap[lg.grupo_id]) libroCountMap[lg.grupo_id] = 0
    libroCountMap[lg.grupo_id]++
  }

  return (
    <div className="min-h-dvh bg-slate-50 pb-10">
      <div className="bg-slate-900 px-6 py-5 flex items-center gap-4">
        <Link href="/admin/grupos" className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Grupos</h1>
          <p className="text-slate-400 text-sm">{colegio?.nombre ?? colegioId}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        <AdminGruposClient
          grupos={(grupos ?? []) as any[]}
          catequistas={(catequistas ?? []) as any[]}
          libros={(libros ?? []) as any[]}
          alumnos={(alumnos ?? []) as any[]}
          libroCountMap={libroCountMap}
          colegioId={colegioId}
        />
      </div>
    </div>
  )
}
