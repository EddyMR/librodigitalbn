import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdminClient()

  // Test 1: simple select (known to work)
  const { data: simple, error: e1 } = await admin
    .from('perfiles').select('id, rol').limit(5)

  // Test 2: exact same query as admin/usuarios page (has join)
  const { data: withJoin, error: e2 } = await admin
    .from('perfiles')
    .select('id, nombre, rol, colegio:colegios(nombre, codigo)')
    .in('rol', ['admin_colegio', 'catequista', 'alumno'])
    .limit(10)

  // Test 3: HEAD count (used by dashboard)
  const { count: headCount, error: e3 } = await admin
    .from('perfiles').select('id', { count: 'exact', head: true }).eq('rol', 'alumno')

  // Test 4: libros
  const { data: libros, error: e4 } = await admin
    .from('libros').select('id, titulo').limit(5)

  return Response.json({
    simple_count: simple?.length,
    simple_error: e1?.message ?? null,
    join_count: withJoin?.length,
    join_sample: withJoin?.[0] ?? null,
    join_error: e2?.message ?? null,
    head_count: headCount,
    head_error: e3?.message ?? null,
    libros_count: libros?.length,
    libros_error: e4?.message ?? null,
  })
}
