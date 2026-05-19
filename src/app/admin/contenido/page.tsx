import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { BookOpen, Plus } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Contenido — Admin' }

export default async function ContenidoPage() {
  const admin = createAdminClient()

  const { data: libros, error } = await admin
    .from('libros')
    .select('id, titulo, descripcion, orden, activo')
    .order('orden')

  if (error) console.error('[ADMIN] Error fetching libros:', error)

  // Fetch bloque counts per libro separately to avoid nested join issues
  const { data: bloquesData } = await admin
    .from('bloques')
    .select('id, libro_id')
    .eq('activo', true)

  const bloquesPerLibro: Record<string, number> = {}
  for (const b of bloquesData ?? []) {
    bloquesPerLibro[b.libro_id] = (bloquesPerLibro[b.libro_id] ?? 0) + 1
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

        {error && (
          <div className="card p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">Error al cargar libros. Verifica la conexión con Supabase.</p>
          </div>
        )}

        {(libros ?? []).length === 0 && !error ? (
          <div className="card p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No hay libros creados aún</p>
            <p className="text-sm text-slate-400 mt-1">Usa el botón de arriba para crear el primer libro</p>
          </div>
        ) : (
          (libros ?? []).map((libro: any) => (
            <div key={libro.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{libro.titulo}</p>
                  <p className="text-xs text-slate-400">
                    {bloquesPerLibro[libro.id] ?? 0} bloques
                    {!libro.activo && ' · Inactivo'}
                  </p>
                </div>
                <Link
                  href={`/admin/contenido/libros/${libro.id}`}
                  className="btn-secondary py-2 px-3 text-xs"
                >
                  Gestionar
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
