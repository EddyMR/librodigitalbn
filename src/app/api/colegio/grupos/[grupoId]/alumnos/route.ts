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

// Agregar alumno al grupo (y quitarlo de cualquier grupo anterior)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  const perfil = await getAdminColegio()
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { grupoId } = await params
  const { alumnoId } = await request.json()
  const admin = createAdminClient()

  // Verificar que el grupo pertenece al colegio
  const { data: grupo } = await admin
    .from('grupos')
    .select('colegio_id')
    .eq('id', grupoId)
    .single()

  if (!grupo || grupo.colegio_id !== perfil.colegio_id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Verificar que el alumno pertenece al colegio
  const { data: alumno } = await admin
    .from('perfiles')
    .select('colegio_id')
    .eq('id', alumnoId)
    .eq('rol', 'alumno')
    .single()

  if (!alumno || alumno.colegio_id !== perfil.colegio_id)
    return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

  // Quitar de grupos anteriores (un alumno solo puede estar en un grupo)
  await admin.from('grupo_alumnos').delete().eq('alumno_id', alumnoId)

  // Agregar al nuevo grupo
  const { error } = await admin
    .from('grupo_alumnos')
    .insert({ grupo_id: grupoId, alumno_id: alumnoId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Quitar alumno del grupo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  const perfil = await getAdminColegio()
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { grupoId } = await params
  const { alumnoId } = await request.json()
  const admin = createAdminClient()

  // Verificar que el grupo pertenece al colegio
  const { data: grupo } = await admin
    .from('grupos')
    .select('colegio_id')
    .eq('id', grupoId)
    .single()

  if (!grupo || grupo.colegio_id !== perfil.colegio_id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { error } = await admin
    .from('grupo_alumnos')
    .delete()
    .eq('grupo_id', grupoId)
    .eq('alumno_id', alumnoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
