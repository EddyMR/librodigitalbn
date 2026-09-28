import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase'

async function getAdminColegio() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, rol, colegio_id')
    .eq('user_id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'admin_colegio') return null
  return perfil
}

export async function GET(request: NextRequest) {
  const perfil = await getAdminColegio()
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const grupoId = request.nextUrl.searchParams.get('grupo_id')
  if (!grupoId) return NextResponse.json({ error: 'grupo_id requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('libro_grupos')
    .select('libro_id')
    .eq('grupo_id', grupoId)
    .eq('activo', true)

  return NextResponse.json({ libros: (data ?? []).map(l => l.libro_id) })
}

export async function POST(request: NextRequest) {
  const perfil = await getAdminColegio()
  if (!perfil) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { grupo_id, libro_id, activo } = await request.json()
  const admin = createAdminClient()

  const { data: grupo } = await admin.from('grupos').select('colegio_id').eq('id', grupo_id).single()
  if (!grupo || grupo.colegio_id !== perfil.colegio_id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // upsert en vez de delete+insert: dos peticiones casi simultáneas (doble tap,
  // reintento tras error de red) podían llegar en el orden equivocado y la que
  // "ganaba" era la última en ejecutarse en el servidor, no la última que pulsó
  // el usuario — así se perdían asignaciones sin ningún error visible. Un solo
  // upsert es atómico: no hay ventana entre borrar e insertar donde una
  // petición concurrente pueda colarse.
  const { error } = await admin
    .from('libro_grupos')
    .upsert(
      { grupo_id, libro_id, activo: !!activo, asignado_at: new Date().toISOString() },
      { onConflict: 'libro_id,grupo_id' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
