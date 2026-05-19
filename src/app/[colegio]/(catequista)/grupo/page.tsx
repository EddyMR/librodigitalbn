import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { avatarUrl, nombreCompleto } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import { Users, ChevronRight, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Mis grupos' }

interface Props { params: Promise<{ colegio: string }> }

export default async function GrupoIndexPage({ params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'catequista') redirect(`/${codigo}/login`)

  const admin = createAdminClient()

  const { data: gruposData } = await admin
    .from('grupos')
    .select('id, nombre')
    .eq('catequista_id', perfil.id)
    .eq('activo', true)

  const grupos = gruposData ?? []

  // Auto-redirect when catequista has exactly one group
  if (grupos.length === 1) redirect(`/${codigo}/grupo/${grupos[0].id}`)

  // Load students per group (flat queries to avoid RLS issues)
  const grupoIds = grupos.map(g => g.id)
  const alumnosMap: Record<string, { id: string; nombre: string; apellido: string; avatar_id: number }[]> = {}
  for (const g of grupos) alumnosMap[g.id] = []

  if (grupoIds.length > 0) {
    const { data: gaRows } = await admin
      .from('grupo_alumnos')
      .select('grupo_id, alumno_id')
      .in('grupo_id', grupoIds)
    const alumnoIds = (gaRows ?? []).map(r => r.alumno_id)
    if (alumnoIds.length > 0) {
      const { data: perfiles } = await admin
        .from('perfiles')
        .select('id, nombre, apellido, avatar_id')
        .in('id', alumnoIds)
      const perfilMap = new Map((perfiles ?? []).map(p => [p.id, p]))
      for (const row of gaRows ?? []) {
        const p = perfilMap.get(row.alumno_id)
        if (p) alumnosMap[row.grupo_id]?.push(p as any)
      }
    }
  }

  const allAlumnoIds = Object.values(alumnosMap).flat().map(a => a.id)

  // Pending reviews: entregas entregadas sin comentario
  const { data: entregasEntregadas } = allAlumnoIds.length > 0
    ? await admin
        .from('entregas')
        .select('id')
        .in('alumno_id', allAlumnoIds)
        .eq('estado', 'entregado')
    : { data: [] }

  const entregaIds = (entregasEntregadas ?? []).map(e => e.id)
  const { data: comentadosData } = entregaIds.length > 0
    ? await admin.from('comentarios').select('entrega_id').in('entrega_id', entregaIds)
    : { data: [] }

  const comentadosSet = new Set((comentadosData ?? []).map(c => c.entrega_id))
  const entregasSinComentario = (entregasEntregadas ?? []).filter(e => !comentadosSet.has(e.id))

  const pendientes = entregasSinComentario.length
  const totalAlumnos = Object.values(alumnosMap).flat().length

  return (
    <div className="space-y-6 px-4 pt-4 pb-24">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500">Catequista</p>
        <h1 className="text-xl font-bold text-slate-900">{nombreCompleto(perfil)}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 space-y-1">
          <p className="text-2xl font-bold text-brand-600">{totalAlumnos}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Alumnos totales
          </p>
        </div>
        <div className="card p-4 space-y-1">
          <p className="text-2xl font-bold text-amber-500">{pendientes}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Sin retroalimentar
          </p>
        </div>
      </div>

      {/* Groups */}
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-500" />
          Mis grupos
        </h2>

        {grupos.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-slate-400 text-sm">Aún no tienes grupos asignados</p>
          </div>
        ) : (
          grupos.map(grupo => {
            const alumnos = alumnosMap[grupo.id] ?? []
            return (
              <Link
                key={grupo.id}
                href={`/${codigo}/grupo/${grupo.id}`}
                className="card card-hover p-4 block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{grupo.nombre}</p>
                    <p className="text-sm text-slate-500">{alumnos.length} alumnos</p>
                    <div className="flex -space-x-2 mt-2">
                      {alumnos.slice(0, 5).map(a => (
                        <Image
                          key={a.id}
                          src={avatarUrl(a.avatar_id)}
                          alt={nombreCompleto(a)}
                          width={24}
                          height={24}
                          className="rounded-full border-2 border-white"
                        />
                      ))}
                      {alumnos.length > 5 && (
                        <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center">
                          <span className="text-xs text-slate-600">+{alumnos.length - 5}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                </div>
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
