import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { grupoId } = await params
  const admin = createAdminClient()

  // Fetch active members of the group
  const { data: gaRows } = await admin
    .from('grupo_alumnos')
    .select('alumno_id')
    .eq('grupo_id', grupoId)
    .eq('activo', true)

  const alumnoIds = (gaRows ?? []).map(r => r.alumno_id)

  if (alumnoIds.length === 0) return NextResponse.json({ alumnos: [] })

  const [{ data: perfiles }, { data: entregas }] = await Promise.all([
    admin
      .from('perfiles')
      .select('id, nombre, apellido, avatar_id')
      .in('id', alumnoIds)
      .order('nombre'),
    admin
      .from('entregas')
      .select('alumno_id')
      .in('alumno_id', alumnoIds),
  ])

  // Count entregas per alumno
  const entregasCount: Record<string, number> = {}
  for (const e of entregas ?? []) {
    entregasCount[e.alumno_id] = (entregasCount[e.alumno_id] ?? 0) + 1
  }

  const alumnos = (perfiles ?? []).map(p => ({
    ...p,
    totalEntregas: entregasCount[p.id] ?? 0,
  }))

  return NextResponse.json({ alumnos })
}
