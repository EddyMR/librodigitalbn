'use client'

import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'

interface Libro { id: string; titulo: string; descripcion: string | null; activo: boolean }

interface Props {
  initialLibros: Libro[]
  initialBloquesPerLibro: Record<string, number>
}

export default function ContenidoClient({ initialLibros, initialBloquesPerLibro }: Props) {
  const [libros, setLibros] = useState<Libro[]>(initialLibros)
  const [bloquesPerLibro, setBloquesPerLibro] = useState(initialBloquesPerLibro)
  const [loading, setLoading] = useState(initialLibros.length === 0)

  useEffect(() => {
    fetch('/api/admin/libros')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.libros)) setLibros(data.libros)
        if (data.bloquesPerLibro) setBloquesPerLibro(data.bloquesPerLibro)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="py-16 text-center text-slate-400 text-sm">Cargando libros...</div>
  }

  if (libros.length === 0) {
    return (
      <div className="card p-12 text-center">
        <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">No hay libros creados aún</p>
        <p className="text-sm text-slate-400 mt-1">Usa el botón de arriba para crear el primer libro</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {libros.map(libro => (
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
            <Link href={`/admin/contenido/libros/${libro.id}`} className="btn-secondary py-2 px-3 text-xs">
              Gestionar
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
