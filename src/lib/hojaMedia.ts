import { createAdminClient } from '@/lib/supabase'

export interface MediaItem {
  tipo: 'audio' | 'video'
  url: string
  video_tipo?: 'youtube' | 'upload'
}

type MedioMeta =
  | { tipo: 'audio' | 'video'; source: 'file'; index: number }
  | { tipo: 'video'; source: 'url'; url: string }
  | { tipo: 'audio' | 'video'; source: 'existing'; url: string; video_tipo?: 'youtube' | 'upload' }

async function uploadMediaFile(
  admin: ReturnType<typeof createAdminClient>,
  file: File,
  basePath: string,
  prefix: string
): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const path = `${basePath}/${prefix}_${unique}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await admin.storage
    .from('libros')
    .upload(path, buffer, { contentType: file.type, cacheControl: '31536000' })
  if (error) return null
  return admin.storage.from('libros').getPublicUrl(path).data.publicUrl
}

// Reads `medios_meta` (JSON array of MedioMeta) from formData and resolves it
// into a final MediaItem[] — uploading any file-backed entries along the way.
export async function processMedios(
  admin: ReturnType<typeof createAdminClient>,
  formData: FormData,
  basePath: string
): Promise<MediaItem[]> {
  const metaStr = formData.get('medios_meta') as string | null
  if (!metaStr) return []

  let metas: MedioMeta[] = []
  try {
    metas = JSON.parse(metaStr)
  } catch {
    return []
  }

  const result: MediaItem[] = []
  for (const m of metas) {
    if (m.source === 'existing') {
      result.push({ tipo: m.tipo, url: m.url, video_tipo: m.video_tipo })
    } else if (m.source === 'url' && m.tipo === 'video') {
      result.push({ tipo: 'video', url: m.url, video_tipo: 'youtube' })
    } else if (m.source === 'file') {
      const file = formData.get(`media_file_${m.index}`) as File | null
      if (file && file.size > 0) {
        const url = await uploadMediaFile(admin, file, basePath, m.tipo)
        if (url) result.push({ tipo: m.tipo, url, video_tipo: m.tipo === 'video' ? 'upload' : undefined })
      }
    }
  }
  return result
}
