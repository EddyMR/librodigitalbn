import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  const { usuarioId } = await params

  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'admin_colegio') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  const { data: target } = await admin
    .from('perfiles')
    .select('colegio_id, rol, user_id, email')
    .eq('id', usuarioId)
    .single()

  if (!target || target.colegio_id !== perfil.colegio_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (target.rol === 'admin_colegio') {
    return NextResponse.json({ error: 'No se puede modificar un administrador' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (body.nombre !== undefined) updates.nombre = body.nombre
  if (body.apellido !== undefined) updates.apellido = body.apellido
  if (body.activo !== undefined) updates.activo = body.activo
  if (body.email !== undefined && target.rol !== 'alumno') updates.email = body.email

  // Actualizar email en Auth si cambió (solo para catequistas con email real)
  if (body.email !== undefined && body.email !== target.email && target.rol !== 'alumno') {
    const { error: authError } = await admin.auth.admin.updateUserById(target.user_id, {
      email: body.email,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const { error } = await admin
    .from('perfiles')
    .update(updates)
    .eq('id', usuarioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  const { usuarioId } = await params

  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'admin_colegio') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('perfiles')
    .select('user_id, colegio_id, rol')
    .eq('id', usuarioId)
    .single()

  if (!target || target.colegio_id !== perfil.colegio_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (target.rol === 'admin_colegio') {
    return NextResponse.json({ error: 'No se puede eliminar un administrador' }, { status: 403 })
  }

  // Para alumnos: verificar entregas
  if (target.rol === 'alumno') {
    const { count: entregasCount } = await admin
      .from('entregas')
      .select('id', { count: 'exact', head: true })
      .eq('alumno_id', usuarioId)

    if ((entregasCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Este alumno tiene ${entregasCount} entrega(s). Elimina primero las entregas o desactiva el usuario.`,
          canDeactivate: true,
        },
        { status: 409 }
      )
    }
  }

  // Para catequistas: verificar grupos activos
  if (target.rol === 'catequista') {
    const { count: gruposCount } = await admin
      .from('grupos')
      .select('id', { count: 'exact', head: true })
      .eq('catequista_id', usuarioId)
      .eq('activo', true)

    if ((gruposCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Este catequista tiene ${gruposCount} grupo(s) activo(s). Reasigna los grupos primero o desactiva el usuario.`,
          canDeactivate: true,
        },
        { status: 409 }
      )
    }
  }

  const { error } = await admin.auth.admin.deleteUser(target.user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
