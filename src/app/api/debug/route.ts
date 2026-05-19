import { createAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const perfil = await getSession()
  const admin = createAdminClient()
  const colegioId = perfil?.colegio_id ?? ''

  const { count: alumnos, error: e1 } = await admin
    .from('perfiles').select('id', { count: 'exact', head: true })
    .eq('colegio_id', colegioId).eq('rol', 'alumno')

  const { count: grupos, error: e2 } = await admin
    .from('grupos').select('id', { count: 'exact', head: true })
    .eq('colegio_id', colegioId).eq('activo', true)

  const keyRaw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  return Response.json({
    session: perfil ? { id: perfil.id, rol: perfil.rol, colegio_id: perfil.colegio_id } : null,
    alumnos_count: alumnos,
    grupos_count: grupos,
    errors: [e1?.message, e2?.message].filter(Boolean),
    service_key: { prefix: keyRaw.substring(0, 15), length: keyRaw.length, has_bom: keyRaw.charCodeAt(0) === 0xFEFF },
    anon_key: { prefix: anonRaw.substring(0, 15), length: anonRaw.length, has_bom: anonRaw.charCodeAt(0) === 0xFEFF },
    supabase_url: { prefix: urlRaw.substring(0, 20), has_bom: urlRaw.charCodeAt(0) === 0xFEFF },
  })
}
