import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase'

function checkAdminAuth(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token')?.value
  return token === process.env.ADMIN_GENERAL_SECRET
}

function hashPassword(password: string): string {
  return createHash('sha256').update(process.env.ADMIN_GENERAL_SECRET! + password).digest('hex')
}

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('admin_passwords')
    .select('id, etiqueta, activo, created_at')
    .eq('activo', true)
    .order('created_at', { ascending: true })
  return NextResponse.json({ passwords: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { etiqueta, password } = await request.json()
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }
  const hash = hashPassword(password)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('admin_passwords')
    .insert({ etiqueta: etiqueta?.trim() || 'Sin nombre', hash })
    .select('id, etiqueta, activo, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, password: data })
}
