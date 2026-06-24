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
  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('nombre')
    .eq('id', grupoId)
    .single()

  if (!grupo) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })

  const { data: rows } = await admin
    .from('grupo_alumnos')
    .select('alumno_id')
    .eq('grupo_id', grupoId)

  const alumnoIds = (rows ?? []).map((r: any) => r.alumno_id)
  if (alumnoIds.length === 0) return NextResponse.json({ ok: true, grupoNombre: grupo.nombre, creds: [] })

  const { data: perfiles } = await admin
    .from('perfiles')
    .select('id, user_id, nombre, apellido, username')
    .in('id', alumnoIds)
    .eq('activo', true)

  const creds: { nombre: string; apellido: string; username: string; password: string }[] = []

  for (const perfil of perfiles ?? []) {
    if (!perfil.user_id) continue
    const password = Math.random().toString(36).slice(-8)
    const { error } = await admin.auth.admin.updateUserById(perfil.user_id, { password })
    if (!error) {
      creds.push({ nombre: perfil.nombre, apellido: perfil.apellido, username: perfil.username, password })
    }
  }

  return NextResponse.json({ ok: true, grupoNombre: grupo.nombre, creds })
}
