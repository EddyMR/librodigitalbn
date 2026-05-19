import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdminAuth(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token')?.value
  return token === process.env.ADMIN_GENERAL_SECRET
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data } = await admin.from('colegios').select('id, nombre, codigo').eq('activo', true).order('nombre')
  return NextResponse.json({ colegios: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { nombre } = await request.json()
  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Generate unique code
  const { data: codigo } = await admin.rpc('generar_codigo_colegio')

  const { data, error } = await admin
    .from('colegios')
    .insert({ nombre: nombre.trim(), codigo })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, colegio: data, codigo: data.codigo })
}
