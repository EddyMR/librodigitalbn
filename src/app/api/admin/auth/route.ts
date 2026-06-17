import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase'

function hashPassword(password: string): string {
  return createHash('sha256').update(process.env.ADMIN_GENERAL_SECRET! + password).digest('hex')
}

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  const supabase = createAdminClient()
  const { data: passwords } = await supabase
    .from('admin_passwords')
    .select('hash')
    .eq('activo', true)

  let valid = false
  if (passwords && passwords.length > 0) {
    const hash = hashPassword(password)
    valid = passwords.some((p: any) => p.hash === hash)
  } else {
    // Bootstrap: no passwords in DB yet, fall back to env var
    valid = password === process.env.ADMIN_GENERAL_SECRET
  }

  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('admin_token', process.env.ADMIN_GENERAL_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return response
}
