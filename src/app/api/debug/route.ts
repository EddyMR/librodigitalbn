import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('colegios')
    .select('*', { count: 'exact', head: true })

  return Response.json({
    ok: !error,
    colegios: count ?? 0,
    error: error?.message ?? null,
    ts: new Date().toISOString(),
  })
}
