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

  // Antes solo se podía restablecer la contraseña de un alumno: un catequista
  // o administrador que se quedaba fuera de su cuenta no tenía forma de
  // recuperarla salvo que lo hiciera él mismo desde /perfil, con sesión activa
  // — precisamente lo que no tiene si perdió el acceso. Ahora cualquier rol de
  // este colegio puede restablecerse desde aquí.
  //
  // Alumnos: contraseña corta y sin caracteres ambiguos, pensada para
  // escribirla a mano o leerla desde un QR impreso. Catequistas y
  // administradores entran con su correo desde cualquier dispositivo, así que
  // llevan una contraseña más larga.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const charsLargo = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const [alfabeto, longitud] = perfil.rol === 'alumno' ? [chars, 6] : [charsLargo, 12]
  const password = Array.from({ length: longitud }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('')

  const { error } = await admin.auth.admin.updateUserById(perfil.user_id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, password })
}
