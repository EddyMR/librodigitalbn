import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'

async function getAdminColegio() {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  const perfil = await getAdminColegio()
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { grupoId } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('colegio_id')
    .eq('id', grupoId)
    .single()

  if (!grupo || grupo.colegio_id !== perfil.colegio_id)
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (body.nombre !== undefined) updates.nombre = body.nombre
  if ('catequista_id' in body) updates.catequista_id = body.catequista_id ?? null

  const { data, error } = await admin
    .from('grupos')
    .update(updates)
    .eq('id', grupoId)
    .select('id, nombre, activo, catequista:perfiles!grupos_catequista_id_fkey(id, nombre, apellido, avatar_id)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, grupo: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  const perfil = await getAdminColegio()
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { grupoId } = await params
  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('colegio_id, nombre')
    .eq('id', grupoId)
    .single()

  if (!grupo || grupo.colegio_id !== perfil.colegio_id)
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Verificar si tiene alumnos
  const { count: alumnosCount } = await admin
    .from('grupo_alumnos')
    .select('alumno_id', { count: 'exact', head: true })
    .eq('grupo_id', grupoId)

  if ((alumnosCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Este grupo tiene ${alumnosCount} alumno(s). Mueve o elimina los alumnos primero, o desactiva el grupo.`,
        alumnosCount,
        canDeactivate: true,
      },
      { status: 409 }
    )
  }

  await admin.from('grupos').delete().eq('id', grupoId)
  return NextResponse.json({ ok: true })
}
