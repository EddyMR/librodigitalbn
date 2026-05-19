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

  // Delete any existing rows (handles duplicates cleanly)
  const { error: delError } = await admin
    .from('libro_grupos')
    .delete()
    .eq('grupo_id', grupo_id)
    .eq('libro_id', libro_id)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (activo) {
    const { error: insError } = await admin
      .from('libro_grupos')
      .insert({ grupo_id, libro_id, activo: true })
    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
