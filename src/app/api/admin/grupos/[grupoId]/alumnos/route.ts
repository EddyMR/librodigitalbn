import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { grupoId } = await params
  const { alumnoId } = await request.json()
  const admin = createAdminClient()

  // Solo quita del grupo activo actual (preserva historial de ciclos anteriores)
  await admin.from('grupo_alumnos').delete().eq('alumno_id', alumnoId).eq('activo', true)

  const { error } = await admin
    .from('grupo_alumnos')
    .insert({ grupo_id: grupoId, alumno_id: alumnoId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { grupoId } = await params
  const { alumnoId } = await request.json()
  const admin = createAdminClient()

  const { error } = await admin
    .from('grupo_alumnos')
    .delete()
    .eq('grupo_id', grupoId)
    .eq('alumno_id', alumnoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
