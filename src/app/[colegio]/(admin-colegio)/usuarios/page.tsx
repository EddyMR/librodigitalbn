import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Plus, Upload } from 'lucide-react'
import UsuariosClient from './UsuariosClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Usuarios' }

interface Props {
  params: Promise<{ colegio: string }>
  searchParams: Promise<{ rol?: string; sin_grupo?: string }>
}

export default async function UsuariosPage({ params, searchParams }: Props) {
  const { colegio: codigo } = await params
  const { rol: rolFiltro, sin_grupo: sinGrupoParam } = await searchParams
  const sinGrupo = sinGrupoParam === '1'
  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'admin_colegio') redirect(`/${codigo}/login`)

  const admin = createAdminClient()
  const colegioId = perfil.colegio_id

  // Step 1: fetch grupos (needed to filter grupo_alumnos)
  const { data: grupos } = await admin
    .from('grupos')
    .select('id, nombre, catequista_id')
    .eq('colegio_id', colegioId)
    .eq('activo', true)
    .order('nombre')

  const grupoIds = (grupos ?? []).map(g => g.id)
  const rolFilter = rolFiltro && ['alumno', 'catequista', 'admin_colegio'].includes(rolFiltro)
    ? [rolFiltro]
    : ['alumno', 'catequista', 'admin_colegio']

  // Step 2: fetch usuarios + grupo_alumnos (flat, no nested join)
  const { data: usuariosRaw } = await admin
    .from('perfiles')
    .select('*')
    .eq('colegio_id', colegioId)
    .in('rol', rolFilter)
    .order('nombre')

  const { data: grupoAlumnosRaw } = grupoIds.length > 0
    ? await admin.from('grupo_alumnos').select('alumno_id, grupo_id').in('grupo_id', grupoIds).eq('activo', true)
    : { data: [] }

  // Build lookup maps
  const grupoNombreMap = new Map((grupos ?? []).map(g => [g.id, g.nombre]))

  // grupos per catequista (no embed = no INNER JOIN)
  const gruposByCatequista = new Map<string, { id: string; nombre: string }[]>()
  for (const g of grupos ?? []) {
    if (!g.catequista_id) continue
    if (!gruposByCatequista.has(g.catequista_id)) gruposByCatequista.set(g.catequista_id, [])
    gruposByCatequista.get(g.catequista_id)!.push({ id: g.id, nombre: g.nombre })
  }

  // grupos per alumno
  const alumnoGrupoMap = new Map<string, { grupo: { id: string; nombre: string } }[]>()
  for (const ga of grupoAlumnosRaw ?? []) {
    if (!alumnoGrupoMap.has(ga.alumno_id)) alumnoGrupoMap.set(ga.alumno_id, [])
    if (grupoNombreMap.has(ga.grupo_id)) {
      alumnoGrupoMap.get(ga.alumno_id)!.push({
        grupo: { id: ga.grupo_id, nombre: grupoNombreMap.get(ga.grupo_id)! },
      })
    }
  }

  const usuarios = (usuariosRaw ?? []).map((u: any) => ({
    ...u,
    grupo_alumnos: alumnoGrupoMap.get(u.id) ?? [],
    grupos_catequista: gruposByCatequista.get(u.id) ?? [],
  }))

  const sinGrupoCount = usuarios.filter(
    u => u.rol === 'alumno' && (u.grupo_alumnos ?? []).length === 0
  ).length

  const usuariosFiltrados = sinGrupo
    ? usuarios.filter(u => u.rol === 'alumno' && (u.grupo_alumnos ?? []).length === 0)
    : usuarios

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100 space-y-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/${codigo}/dashboard`} className="text-brand-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900 flex-1">Usuarios</h1>
          <Link href={`/${codigo}/usuarios/masivo`} className="btn-secondary py-2 px-3 text-sm">
            <Upload className="w-4 h-4" /> Masivo
          </Link>
          <Link href={`/${codigo}/usuarios/nuevo`} className="btn-primary py-2 px-3 text-sm">
            <Plus className="w-4 h-4" /> Nuevo
          </Link>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Todos', value: '' },
            { label: 'Alumnos', value: 'alumno' },
            { label: 'Catequistas', value: 'catequista' },
            { label: 'Admins', value: 'admin_colegio' },
          ].map(tab => (
            <Link
              key={tab.value}
              href={`/${codigo}/usuarios${tab.value ? `?rol=${tab.value}` : ''}`}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                !sinGrupo && (rolFiltro ?? '') === tab.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </Link>
          ))}
          <Link
            href={`/${codigo}/usuarios?sin_grupo=1`}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
              sinGrupo
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Sin grupo
            {sinGrupoCount > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${sinGrupo ? 'bg-amber-400 text-white' : 'bg-amber-200 text-amber-800'}`}>
                {sinGrupoCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <UsuariosClient
        usuarios={usuariosFiltrados as any[]}
        grupos={(grupos ?? []) as any[]}
        codigoColegio={codigo}
        rolAdmin={perfil.rol}
      />
    </div>
  )
}
