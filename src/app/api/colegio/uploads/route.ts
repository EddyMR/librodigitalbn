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

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const hoja_id = formData.get('hoja_id') as string | null
  const tipo = formData.get('tipo') as string | null // 'foto' | 'audio'

  if (!file || !hoja_id || !tipo)
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const mimeType = file.type || 'application/octet-stream'
  const ext = file.name.split('.').pop()
    || (tipo === 'audio'
      ? (mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm')
      : 'jpg')

  const path = `${tipo}/${perfil.id}/${hoja_id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('entregas')
    .upload(path, buffer, { contentType: mimeType, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('entregas').getPublicUrl(path)

  return NextResponse.json({ ok: true, url: publicUrl })
}
