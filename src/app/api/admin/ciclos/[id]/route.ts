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

  const updates: Record<string, unknown> = {}
  if (body.nombre !== undefined) updates.nombre = body.nombre
  if (body.descripcion !== undefined) updates.descripcion = body.descripcion
  if (body.activo !== undefined) updates.activo = body.activo

  // Solo un ciclo activo a la vez
  if (body.activo === true) {
    await admin.from('ciclos').update({ activo: false }).neq('id', id)
  }

  const { data, error } = await admin
    .from('ciclos')
    .update(updates)
    .eq('id', id)
    .select('id, nombre, descripcion, activo, orden, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ciclo: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { count } = await admin
    .from('grupos')
    .select('*', { count: 'exact', head: true })
    .eq('ciclo_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Este ciclo tiene ${count} grupo(s) asignado(s). Reasigna o elimina los grupos primero.` },
      { status: 409 }
    )
  }

  const { error } = await admin.from('ciclos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
