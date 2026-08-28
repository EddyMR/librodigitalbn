import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, rol')
    .eq('user_id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'alumno')
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { hoja_id } = body
  if (!hoja_id) return NextResponse.json({ error: 'Falta hoja_id' }, { status: 400 })

  await admin
    .from('visitas_hojas')
    .upsert(
      { alumno_id: perfil.id, hoja_id, ultima_visita: new Date().toISOString() },
      { onConflict: 'alumno_id,hoja_id' }
    )

  return NextResponse.json({ ok: true })
}
