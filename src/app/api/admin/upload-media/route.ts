import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

// Generates a signed upload URL so the client can PUT the file directly
// to Supabase storage without routing large binaries through Vercel.
export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename, contentType, folder } = await request.json()
  if (!filename || !folder) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const admin = createAdminClient()
  const ext = String(filename).split('.').pop() ?? 'bin'
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const path = `${folder}/audio_${unique}.${ext}`

  const { data, error } = await admin.storage
    .from('libros')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Error generando URL' }, { status: 500 })
  }

  const publicUrl = admin.storage.from('libros').getPublicUrl(path).data.publicUrl

  return NextResponse.json({ signedUrl: data.signedUrl, path, publicUrl })
}
