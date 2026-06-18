import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ libroId: string }> }
) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { libroId } = await params
  const admin = createAdminClient()

  const { data: bloquesData } = await admin
    .from('bloques')
    .select('id, titulo, descripcion, orden, activo')
    .eq('libro_id', libroId)
    .eq('activo', true)
    .order('orden')

  const bloqueIds = (bloquesData ?? []).map((b: any) => b.id)

  const { data: hojasData } = bloqueIds.length > 0
    ? await admin
        .from('hojas')
        .select('id, titulo, tipo, imagen_url, orden, bloque_id, config')
        .in('bloque_id', bloqueIds)
        .eq('activo', true)
        .order('orden')
    : { data: [] as any[] }

  const bloques = (bloquesData ?? []).map((b: any) => ({
    ...b,
    hojas: (hojasData ?? []).filter((h: any) => h.bloque_id === b.id),
  }))

  return NextResponse.json({ bloques })
}
