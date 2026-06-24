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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  const perfil = await getAdminColegio()
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { grupoId } = await params
  const admin = createAdminClient()

  const { data: grupo } = await admin
    .from('grupos')
    .select('nombre, colegio_id')
    .eq('id', grupoId)
    .single()

  if (!grupo || grupo.colegio_id !== perfil.colegio_id)
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

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
    .eq('colegio_id', perfil.colegio_id)
    .eq('activo', true)

  const creds: { nombre: string; apellido: string; username: string; password: string }[] = []

  for (const p of perfiles ?? []) {
    if (!p.user_id) continue
    const password = Math.random().toString(36).slice(-8)
    const { error } = await admin.auth.admin.updateUserById(p.user_id, { password })
    if (!error) {
      creds.push({ nombre: p.nombre, apellido: p.apellido, username: p.username, password })
    }
  }

  return NextResponse.json({ ok: true, grupoNombre: grupo.nombre, creds })
}
