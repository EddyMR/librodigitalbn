import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { nombreCompleto, avatarUrl } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { Users, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import AutoRefresh from './AutoRefresh'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Panel del colegio' }

interface Props { params: Promise<{ colegio: string }> }

export default async function AdminColegioDashboard({ params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()
  if (!perfil) redirect(`/${codigo}/login`)
  // Redirigir otros roles a su página de inicio
  if (perfil.rol === 'alumno') redirect(`/${codigo}/inicio`)
  if (perfil.rol === 'catequista') redirect(`/${codigo}/grupo`)
  if (perfil.rol !== 'admin_colegio') redirect(`/${codigo}/login`)

  const admin = createAdminClient()
  const colegioId = perfil.colegio_id

  const [
    { count: totalAlumnos },
    { count: totalCatequistas },
    { count: totalGrupos },
    { data: grupos },
  ] = await Promise.all([
    admin.from('perfiles').select('id', { count: 'exact', head: true }).eq('colegio_id', colegioId).eq('rol', 'alumno'),
    admin.from('perfiles').select('id', { count: 'exact', head: true }).eq('colegio_id', colegioId).eq('rol', 'catequista'),
    admin.from('grupos').select('id', { count: 'exact', head: true }).eq('colegio_id', colegioId).eq('activo', true),
    admin.from('grupos')
      .select('id, nombre, catequista:perfiles(nombre, apellido)')
      .eq('colegio_id', colegioId)
      .eq('activo', true)
      .order('nombre')
      .limit(5),
  ])

  return (
    <div className="space-y-5 px-4 pt-4 pb-24">
      <AutoRefresh />
      {/* Header */}
      <div className="flex items-center gap-3">
        <Image src={avatarUrl(perfil.avatar_id)} alt="Avatar" width={52} height={52} className="rounded-2xl" />
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Administrador</p>
          <h1 className="text-xl font-bold text-slate-900">{nombreCompleto(perfil)}</h1>
          <p className="text-sm text-slate-500">{perfil.colegio?.nombre}</p>
          {perfil.colegio?.codigo && (
            <p className="text-xs text-slate-400 mt-0.5">
              Código: <span className="font-mono font-bold text-brand-600 tracking-widest">{perfil.colegio.codigo}</span>
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Alumnos', value: totalAlumnos ?? 0, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Catequistas', value: totalCatequistas ?? 0, color: 'text-gold-600', bg: 'bg-gold-50' },
          { label: 'Grupos', value: totalGrupos ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`card p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Agregar alumno', href: `/${codigo}/usuarios/nuevo?rol=alumno`, icon: '👤', color: 'bg-brand-600' },
          { label: 'Agregar catequista', href: `/${codigo}/usuarios/nuevo?rol=catequista`, icon: '✝️', color: 'bg-gold-500' },
          { label: 'Gestionar grupos', href: `/${codigo}/grupos`, icon: '👥', color: 'bg-purple-600' },
          { label: 'Gestionar usuarios', href: `/${codigo}/usuarios`, icon: '📋', color: 'bg-green-600' },
        ].map(a => (
          <Link key={a.label} href={a.href}
            className="card card-hover p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center text-xl`}>
              {a.icon}
            </div>
            <span className="text-sm font-semibold text-slate-700 leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Bulk upload shortcut */}
      <Link
        href={`/${codigo}/usuarios/masivo`}
        className="card card-hover p-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-xl flex-shrink-0">
          📥
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">Subir alumnos masivo</p>
          <p className="text-xs text-slate-400">Pega una lista o importa desde Excel</p>
        </div>
      </Link>

      {/* Recent groups */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Grupos</h2>
          <Link href={`/${codigo}/grupos`} className="text-sm text-brand-600 hover:underline">Ver todos</Link>
        </div>
        {(grupos ?? []).map((g: any) => (
          <Link key={g.id} href={`/${codigo}/grupos`}
            className="card card-hover p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{g.nombre}</p>
              {g.catequista && (
                <p className="text-xs text-slate-400">Catequista: {nombreCompleto(g.catequista)}</p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </Link>
        ))}
      </section>
    </div>
  )
}
