import { createAdminClient } from '@/lib/supabase'
import { Users, Upload } from 'lucide-react'
import Link from 'next/link'
import AdminUsuariosClient from './AdminUsuariosClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Usuarios — Admin' }

interface Props {
  searchParams: Promise<{ rol?: string }>
}

export default async function AdminUsuariosPage({ searchParams }: Props) {
  const { rol } = await searchParams
  const admin = createAdminClient()

  const [
    { data: usuarios },
    { data: colegios },
    { data: libros },
    { data: grupoAlumnosData },
  ] = await Promise.all([
    admin
      .from('perfiles')
      .select('*')
      .in('rol', ['admin_colegio', 'catequista', 'alumno'])
      .order('nombre'),
    admin.from('colegios').select('id, nombre, codigo, activo').order('nombre'),
    admin.from('libros').select('id, titulo').eq('activo', true),
    admin.from('grupo_alumnos').select('alumno_id, grupo_id').eq('activo', true),
  ])

  // Build colegio lookup map
  const colegiosMap = new Map((colegios ?? []).map((c: any) => [c.id, { nombre: c.nombre, codigo: c.codigo }]))

  // Build grupo nombre map for active groups
  // (no join embed to avoid PostgREST INNER JOIN silently dropping rows)
  const grupoIds = [...new Set((grupoAlumnosData ?? []).map((ga: any) => ga.grupo_id))]
  const { data: gruposData } = grupoIds.length > 0
    ? await admin.from('grupos').select('id, nombre').in('id', grupoIds)
    : { data: [] as any[] }
  const grupoNombreMap = new Map((gruposData ?? []).map((g: any) => [g.id, g.nombre]))

  const gruposByAlumno: Record<string, { grupo_id: string; grupo: { id: string; nombre: string } | null }[]> = {}
  for (const ga of (grupoAlumnosData ?? []) as any[]) {
    if (!gruposByAlumno[ga.alumno_id]) gruposByAlumno[ga.alumno_id] = []
    gruposByAlumno[ga.alumno_id].push({
      grupo_id: ga.grupo_id,
      grupo: grupoNombreMap.has(ga.grupo_id) ? { id: ga.grupo_id, nombre: grupoNombreMap.get(ga.grupo_id)! } : null,
    })
  }
  const usuariosConGrupo = (usuarios ?? []).map((u: any) => ({
    ...u,
    colegio: u.colegio_id ? (colegiosMap.get(u.colegio_id) ?? null) : null,
    grupo_alumnos: gruposByAlumno[u.id] ?? [],
  }))

  const totales = {
    admins: (usuarios ?? []).filter((u: any) => u.rol === 'admin_colegio').length,
    catequistas: (usuarios ?? []).filter((u: any) => u.rol === 'catequista').length,
    alumnos: (usuarios ?? []).filter((u: any) => u.rol === 'alumno').length,
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5">
        <a href="/admin/dashboard" className="text-slate-400 text-sm hover:text-white">← Dashboard</a>
        <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
          <Users className="w-5 h-5" /> Usuarios del sistema
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">
          {totales.admins} administradores · {totales.catequistas} catequistas · {totales.alumnos} alumnos
        </p>
      </div>

      <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
        <Link
          href="/admin/usuarios/masivo"
          className="flex items-center gap-3 p-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors"
        >
          <Upload className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Subir alumnos masivo</p>
            <p className="text-xs text-teal-100">Pega una lista y asígnalos a un colegio y grupo</p>
          </div>
        </Link>
        <AdminUsuariosClient
          usuarios={usuariosConGrupo as any[]}
          colegios={(colegios ?? []).filter((c: any) => c.activo !== false) as any[]}
          rolFiltro={rol ?? ''}
          libros={(libros ?? []) as any[]}
        />
      </div>
    </div>
  )
}
