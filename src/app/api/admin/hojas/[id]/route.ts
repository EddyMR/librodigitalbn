import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

async function uploadFile(
  admin: ReturnType<typeof createAdminClient>,
  file: File,
  path: string
): Promise<string | null> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await admin.storage
    .from('libros')
    .upload(path, buffer, { contentType: file.type, cacheControl: '31536000' })
  if (error) return null
  return admin.storage.from('libros').getPublicUrl(path).data.publicUrl
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()
  const ts = Date.now()

  const formData = await request.formData()
  const titulo = formData.get('titulo') as string | null
  const tipo = formData.get('tipo') as string | null
  const configStr = formData.get('config') as string | null
  const file = formData.get('file') as File | null
  const audioFile = formData.get('audio_file') as File | null
  const videoFile = formData.get('video_file') as File | null
  const videoUrl = formData.get('video_url') as string | null
  const libroId = formData.get('libro_id') as string | null
  const bloqueId = formData.get('bloque_id') as string | null

  const updates: Record<string, unknown> = {}
  if (titulo !== null) updates.titulo = titulo.trim() || null
  if (tipo) updates.tipo = tipo

  // Start with base config sent by client (existing audio/video URLs to keep)
  let config: Record<string, unknown> = configStr ? JSON.parse(configStr) : {}

  // Upload new main image if provided
  if (file && file.size > 0 && libroId && bloqueId) {
    const ext = file.name.split('.').pop()
    const imageUrl = await uploadFile(admin, file, `libros/${libroId}/${bloqueId}/${ts}.${ext}`)
    if (!imageUrl) return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 })
    updates.imagen_url = imageUrl
  }

  // Handle multimedia extra uploads
  if (tipo === 'multimedia' && libroId && bloqueId) {
    if (audioFile && audioFile.size > 0) {
      const audioExt = audioFile.name.split('.').pop()
      const audioUrl = await uploadFile(admin, audioFile, `libros/${libroId}/${bloqueId}/audio_${ts}.${audioExt}`)
      if (audioUrl) config.audio_url = audioUrl
    }
    if (videoFile && videoFile.size > 0) {
      const videoExt = videoFile.name.split('.').pop()
      const videoUploadUrl = await uploadFile(admin, videoFile, `libros/${libroId}/${bloqueId}/video_${ts}.${videoExt}`)
      if (videoUploadUrl) { config.video_url = videoUploadUrl; config.video_tipo = 'upload' }
    } else if (videoUrl?.trim()) {
      config.video_url = videoUrl.trim()
      config.video_tipo = 'youtube'
    }
  }

  updates.config = Object.keys(config).length > 0 ? config : null

  const { data, error } = await admin
    .from('hojas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, hoja: data })
}
