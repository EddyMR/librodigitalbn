import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ciclos')
    .select('id, nombre, descripcion, activo, orden, created_at')
    .order('orden', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ciclos: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nombre, descripcion } = await request.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const admin = createAdminClient()

  const { data: maxRow } = await admin
    .from('ciclos')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrden = ((maxRow as any)?.orden ?? 0) + 1

  const { data, error } = await admin
    .from('ciclos')
    .insert({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null, orden: nextOrden })
    .select('id, nombre, descripcion, activo, orden, created_at')
    .single()

  if (error) {
    const isDuplicate = error.code === '23505'
    return NextResponse.json(
      { error: isDuplicate ? `Ya existe un ciclo llamado "${nombre.trim()}"` : error.message },
      { status: isDuplicate ? 409 : 500 }
    )
  }
  return NextResponse.json({ ok: true, ciclo: data })
}
