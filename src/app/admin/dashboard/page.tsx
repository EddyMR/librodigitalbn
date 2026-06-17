import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { Building2, Users, BookOpen, Plus, LayoutList, Upload, ShieldCheck, CalendarDays, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Panel General' }

export default async function AdminDashboard() {
  const admin = createAdminClient()

  const [
    { count: totalColegios },
    { count: totalAlumnos },
    { count: totalCatequistas },
    { count: totalLibros },
  ] = await Promise.all([
    admin.from('colegios').select('*', { count: 'exact', head: true }),
    admin.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'alumno'),
    admin.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'catequista'),
    admin.from('libros').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Colegios', value: totalColegios ?? 0, icon: Building2, href: '/admin/colegios', color: 'bg-brand-100 text-brand-700' },
    { label: 'Alumnos', value: totalAlumnos ?? 0, icon: Users, href: '/admin/usuarios?rol=alumno', color: 'bg-green-100 text-green-700' },
    { label: 'Catequistas', value: totalCatequistas ?? 0, icon: Users, href: '/admin/usuarios?rol=catequista', color: 'bg-gold-100 text-gold-700' },
    { label: 'Libros', value: totalLibros ?? 0, icon: BookOpen, href: '/admin/contenido', color: 'bg-purple-100 text-purple-700' },
  ]

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Admin header */}
      <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Panel General</h1>
          <p className="text-slate-400 text-sm">Administración de la plataforma</p>
        </div>
        <a href="/" className="text-slate-400 hover:text-white text-sm">← Salir</a>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map(stat => (
            <Link key={stat.label} href={stat.href} className="card card-hover p-5 space-y-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <section className="space-y-3">
          <h2 className="font-semibold text-slate-700">Acciones rápidas</h2>
          <div className="space-y-2">
            {[
              { label: 'Gestionar colegios', href: '/admin/colegios', icon: Building2 },
              { label: 'Gestionar usuarios', href: '/admin/usuarios', icon: Users },
              { label: 'Subir alumnos masivo', href: '/admin/usuarios/masivo', icon: Upload },
              { label: 'Gestionar grupos', href: '/admin/grupos', icon: LayoutList },
              { label: 'Ciclos catequéticos', href: '/admin/ciclos', icon: CalendarDays },
              { label: 'Promover alumnos', href: '/admin/promocion', icon: ArrowRight },
              { label: 'Gestionar libros y contenido', href: '/admin/contenido', icon: BookOpen },
              { label: 'Contraseñas del panel', href: '/admin/seguridad', icon: ShieldCheck },
            ].map(action => (
              <Link
                key={action.label}
                href={action.href}
                className="card card-hover p-4 flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center">
                  <action.icon className="w-4 h-4 text-brand-600" />
                </div>
                <span className="font-medium text-slate-800 flex-1">{action.label}</span>
                <Plus className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
