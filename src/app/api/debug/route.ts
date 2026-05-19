import { createAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const perfil = await getSession()
  const admin = createAdminClient()

  // Direct queries with NO session dependency - test raw admin client
  const { data: perfilesData, error: e1 } = await admin
    .from('perfiles').select('id, rol').limit(10)

  const { data: colegiosData, error: e2 } = await admin
    .from('colegios').select('id, nombre').limit(5)

  const { data: gruposData, error: e3 } = await admin
    .from('grupos').select('id, nombre').limit(5)

  const keyRaw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  return Response.json({
    session: perfil ? { id: perfil.id, rol: perfil.rol, colegio_id: perfil.colegio_id } : null,
    perfiles: perfilesData,
    perfiles_error: e1?.message ?? null,
    colegios: colegiosData,
    colegios_error: e2?.message ?? null,
    grupos: gruposData,
    grupos_error: e3?.message ?? null,
    service_key: { prefix: keyRaw.substring(0, 15), length: keyRaw.length, has_bom: keyRaw.charCodeAt(0) === 0xFEFF },
    anon_key: { prefix: anonRaw.substring(0, 15), length: anonRaw.length, has_bom: anonRaw.charCodeAt(0) === 0xFEFF },
    supabase_url: { prefix: urlRaw.substring(0, 20), has_bom: urlRaw.charCodeAt(0) === 0xFEFF },
  })
}
