import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('perfiles')
    .select('user_id, rol')
    .eq('id', id)
    .single()

  if (!perfil) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Alumnos: contraseña corta y sin caracteres ambiguos, para escribirla a mano
  // o leerla desde un QR impreso. Catequistas y administradores entran con su
  // correo desde cualquier dispositivo, así que llevan una más larga.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const charsLargo = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const [alfabeto, longitud] = perfil.rol === 'alumno' ? [chars, 6] : [charsLargo, 12]
  const password = Array.from({ length: longitud }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('')

  const { error } = await admin.auth.admin.updateUserById(perfil.user_id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, password })
}
