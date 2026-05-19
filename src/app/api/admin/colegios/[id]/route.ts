import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('colegios')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, colegio: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Verificar si tiene usuarios (perfiles)
  const { count: perfilesCount } = await admin
    .from('perfiles')
    .select('id', { count: 'exact', head: true })
    .eq('colegio_id', id)

  if ((perfilesCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Este colegio tiene ${perfilesCount} usuario(s). Elimina primero los usuarios o desactiva el colegio.`,
        canDeactivate: true,
      },
      { status: 409 }
    )
  }

  const { error } = await admin.from('colegios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
