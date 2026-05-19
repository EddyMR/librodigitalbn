import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const { data: current } = await admin
    .from('perfiles')
    .select('user_id, email, rol')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  if (body.nombre !== undefined) updates.nombre = body.nombre
  if (body.apellido !== undefined) updates.apellido = body.apellido
  if (body.email !== undefined) updates.email = body.email
  if (body.activo !== undefined) updates.activo = body.activo
  if (body.colegio_id !== undefined) updates.colegio_id = body.colegio_id

  // Actualizar email en Supabase Auth para catequistas/admins (usan email real)
  if (body.email !== undefined && body.email !== current.email && current.rol !== 'alumno') {
    const { error: authError } = await admin.auth.admin.updateUserById(current.user_id, {
      email: body.email,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const { error } = await admin.from('perfiles').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('perfiles')
    .select('user_id, rol, nombre, apellido')
    .eq('id', id)
    .single()

  if (!perfil) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Verificar datos relacionados según el rol
  if (perfil.rol === 'alumno') {
    const { count: entregasCount } = await admin
      .from('entregas')
      .select('id', { count: 'exact', head: true })
      .eq('alumno_id', id)

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

  if (perfil.rol === 'catequista') {
    const { count: gruposCount } = await admin
      .from('grupos')
      .select('id', { count: 'exact', head: true })
      .eq('catequista_id', id)
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

  const { error } = await admin.auth.admin.deleteUser(perfil.user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
