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

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const bloque_id = formData.get('bloque_id') as string
  const libro_id = formData.get('libro_id') as string
  const titulo = formData.get('titulo') as string | null
  const tipo = formData.get('tipo') as string
  const orden = parseInt(formData.get('orden') as string, 10)
  const configStr = formData.get('config') as string | null
  let config: Record<string, unknown> = configStr ? JSON.parse(configStr) : {}

  if (!file || !bloque_id) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const admin = createAdminClient()
  const ts = Date.now()

  // Upload page image
  const ext = file.name.split('.').pop()
  const imagePath = `libros/${libro_id}/${bloque_id}/${ts}.${ext}`
  const imageUrl = await uploadFile(admin, file, imagePath)
  if (!imageUrl) return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 })

  // Handle multimedia extra files (multiple audios/videos per hoja)
  if (tipo === 'multimedia') {
    const medios = await processMedios(admin, formData, `libros/${libro_id}/${bloque_id}`)
    if (medios.length > 0) config.medios = medios
  }

  const { data, error } = await admin
    .from('hojas')
    .insert({
      bloque_id,
      titulo: titulo || null,
      tipo,
      imagen_url: imageUrl,
      orden,
      ...(Object.keys(config).length > 0 ? { config } : {}),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, hoja: data })
}

export async function PATCH(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const admin = createAdminClient()

  const { error } = await admin.from('hojas').update({ activo: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PUT(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bloqueId, hojaIds } = await request.json()
  if (!bloqueId || !Array.isArray(hojaIds) || hojaIds.length === 0) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const admin = createAdminClient()
  for (let i = 0; i < hojaIds.length; i++) {
    const { data, error } = await admin
      .from('hojas')
      .update({ orden: i + 1 })
      .eq('id', hojaIds[i])
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: `No se pudo actualizar la hoja ${i + 1}` }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true })
}
