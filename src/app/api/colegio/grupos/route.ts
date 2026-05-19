import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'

async function getAdminColegio(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, rol, colegio_id')
    .eq('user_id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'admin_colegio') return null
  return perfil
}

export async function POST(request: NextRequest) {
  const perfil = await getAdminColegio(request)
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { nombre, catequista_id } = await request.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('grupos')
    .insert({ colegio_id: perfil.colegio_id, nombre: nombre.trim(), catequista_id: catequista_id || null })
    .select('id, nombre, activo, catequista:perfiles!grupos_catequista_id_fkey(id, nombre, apellido)')
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

export async function PATCH(request: NextRequest) {
  const perfil = await getAdminColegio(request)
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await request.json()
  const admin = createAdminClient()

  const { data: grupo } = await admin.from('grupos').select('colegio_id').eq('id', id).single()
  if (!grupo || grupo.colegio_id !== perfil.colegio_id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await admin.from('grupos').update({ activo: false }).eq('id', id)
  return NextResponse.json({ ok: true })
}
