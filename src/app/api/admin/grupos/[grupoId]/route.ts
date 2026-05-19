import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { grupoId } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const updates: Record<string, unknown> = {}
  if (body.nombre !== undefined) updates.nombre = body.nombre
  if ('catequista_id' in body) updates.catequista_id = body.catequista_id ?? null
  if (body.activo !== undefined) updates.activo = body.activo

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
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { grupoId } = await params
  const admin = createAdminClient()

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

  const { error } = await admin.from('grupos').delete().eq('id', grupoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
