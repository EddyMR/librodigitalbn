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

  return Response.json({
    session: perfil ? { id: perfil.id, rol: perfil.rol, colegio_id: perfil.colegio_id } : null,
    alumnos_count: alumnos,
    grupos_count: grupos,
    errors: [e1?.message, e2?.message].filter(Boolean),
    key_prefix: keyRaw.substring(0, 15),
    key_length: keyRaw.length,
  })
}
