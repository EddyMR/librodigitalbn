import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()

  const [{ data: libros }, { data: bloquesData }] = await Promise.all([
    admin.from('libros').select('id, titulo, descripcion, activo').order('orden'),
    admin.from('bloques').select('id, libro_id').eq('activo', true),
  ])

  const bloquesPerLibro: Record<string, number> = {}
  for (const b of bloquesData ?? []) {
    bloquesPerLibro[(b as any).libro_id] = (bloquesPerLibro[(b as any).libro_id] ?? 0) + 1
  }

  return NextResponse.json({ libros: libros ?? [], bloquesPerLibro })
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const admin = createAdminClient()

  const { data: libro, error } = await admin
    .from('libros')
    .insert({
      titulo: body.titulo,
      descripcion: body.descripcion ?? null,
      portada_url: body.portada_url ?? null,
      orden: body.orden ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-assign to all active groups across all colegios
  const { data: grupos } = await admin
    .from('grupos')
    .select('id')
    .eq('activo', true)

  if (grupos && grupos.length > 0) {
    await admin.from('libro_grupos').upsert(
      grupos.map(g => ({ libro_id: libro.id, grupo_id: g.id, activo: true })),
      { ignoreDuplicates: true }
    )
  }

  return NextResponse.json({ ok: true, libro })
}
