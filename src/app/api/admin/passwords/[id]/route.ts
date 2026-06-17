import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdminAuth(request: NextRequest): boolean {
  const token = request.cookies.get('admin_token')?.value
  return token === process.env.ADMIN_GENERAL_SECRET
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const supabase = createAdminClient()

  // Prevent deleting the last active password
  const { count } = await supabase
    .from('admin_passwords')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)

  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: 'No puedes eliminar la última contraseña activa' }, { status: 400 })
  }

  const { error } = await supabase.from('admin_passwords').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
