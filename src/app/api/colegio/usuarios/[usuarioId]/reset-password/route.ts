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
  _request: NextRequest,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  const adminPerfil = await getAdminColegio()
  if (!adminPerfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { usuarioId } = await params
  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('perfiles')
    .select('user_id, rol, colegio_id')
    .eq('id', usuarioId)
    .single()

  if (!perfil || perfil.colegio_id !== adminPerfil.colegio_id)
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (perfil.rol !== 'alumno')
    return NextResponse.json({ error: 'Solo se puede restablecer para alumnos' }, { status: 400 })

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const password = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  const { error } = await admin.auth.admin.updateUserById(perfil.user_id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, password })
}
