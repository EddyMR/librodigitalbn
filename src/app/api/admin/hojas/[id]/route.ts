import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { processMedios } from '@/lib/hojaMedia'

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
  const libroId = formData.get('libro_id') as string | null
  const bloqueId = formData.get('bloque_id') as string | null

  const updates: Record<string, unknown> = {}
  if (titulo !== null) updates.titulo = titulo.trim() || null
  if (tipo) updates.tipo = tipo

  // Start with base config sent by client (e.g. preguntas for cuestionario)
  let config: Record<string, unknown> = configStr ? JSON.parse(configStr) : {}

  // Upload new main image if provided
  if (file && file.size > 0 && libroId && bloqueId) {
    const ext = file.name.split('.').pop()
    const imageUrl = await uploadFile(admin, file, `libros/${libroId}/${bloqueId}/${ts}.${ext}`)
    if (!imageUrl) return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 })
    updates.imagen_url = imageUrl
  }

  // Handle multimedia extra uploads (multiple audios/videos per hoja)
  if (tipo === 'multimedia' && libroId && bloqueId) {
    const medios = await processMedios(admin, formData, `libros/${libroId}/${bloqueId}`)
    if (medios.length > 0) config.medios = medios
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
