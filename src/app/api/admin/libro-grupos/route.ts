import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const grupoId = request.nextUrl.searchParams.get('grupo_id')
  if (!grupoId) return NextResponse.json({ error: 'grupo_id requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('libro_grupos')
    .select('libro_id')
    .eq('grupo_id', grupoId)
    .eq('activo', true)

  return NextResponse.json({ libros: (data ?? []).map((l: { libro_id: string }) => l.libro_id) })
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { grupo_id, libro_id, activo } = await request.json()
  const admin = createAdminClient()

  // upsert en vez de delete+insert: ver el comentario equivalente en
  // /api/colegio/libro-grupos — dos peticiones casi simultáneas podían
  // resolverse en el orden equivocado y perder una asignación en silencio.
  const { error } = await admin
    .from('libro_grupos')
    .upsert(
      { grupo_id, libro_id, activo: !!activo, asignado_at: new Date().toISOString() },
      { onConflict: 'libro_id,grupo_id' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
