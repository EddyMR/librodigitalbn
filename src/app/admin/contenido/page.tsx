import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ContenidoClient from './ContenidoClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Contenido — Admin' }

export default async function ContenidoPage() {
  const admin = createAdminClient()

  const [{ data: libros }, { data: bloquesData }] = await Promise.all([
    admin.from('libros').select('id, titulo, descripcion, activo').order('orden'),
    admin.from('bloques').select('id, libro_id').eq('activo', true),
  ])

  const bloquesPerLibro: Record<string, number> = {}
  for (const b of bloquesData ?? []) {
    bloquesPerLibro[(b as any).libro_id] = (bloquesPerLibro[(b as any).libro_id] ?? 0) + 1
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5">
        <a href="/admin/dashboard" className="text-slate-400 text-sm hover:text-white">← Dashboard</a>
        <h1 className="text-xl font-bold text-white mt-1">Contenido central</h1>
        <p className="text-slate-400 text-xs mt-0.5">Libros, bloques y hojas compartidos por todos los colegios</p>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto space-y-4">
        <Link href="/admin/contenido/libros/nuevo" className="btn-primary w-full justify-center">
          <Plus className="w-4 h-4" /> Nuevo libro
        </Link>

        <ContenidoClient
          initialLibros={libros ?? []}
          initialBloquesPerLibro={bloquesPerLibro}
        />
      </div>
    </div>
  )
}
