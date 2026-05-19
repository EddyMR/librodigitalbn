import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const colegioId = request.nextUrl.searchParams.get('colegio_id')
  if (!colegioId) return NextResponse.json({ error: 'colegio_id requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data: grupos, error } = await admin
    .from('grupos')
    .select(`
      id, nombre, activo, created_at,
      catequista:perfiles!grupos_catequista_id_fkey(id, nombre, apellido, avatar_id),
      grupo_alumnos(alumno_id)
    `)
    .eq('colegio_id', colegioId)
    .order('nombre')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ grupos: grupos ?? [] })
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { colegio_id, nombre, catequista_id } = await request.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  if (!colegio_id) return NextResponse.json({ error: 'colegio_id requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('grupos')
    .insert({ colegio_id, nombre: nombre.trim(), catequista_id: catequista_id || null })
    .select('id, nombre, activo, catequista:perfiles!grupos_catequista_id_fkey(id, nombre, apellido, avatar_id)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-assign all active libros to the new group
  const { data: libros } = await admin.from('libros').select('id').eq('activo', true)
  if (libros && libros.length > 0) {
    await admin.from('libro_grupos').upsert(
      libros.map(l => ({ libro_id: l.id, grupo_id: data.id, activo: true })),
      { ignoreDuplicates: true }
    )
  }

  return NextResponse.json({ ok: true, grupo: { ...data, grupo_alumnos: [] } })
}
