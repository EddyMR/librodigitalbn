import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

function checkAdmin(request: NextRequest) {
  return request.cookies.get('admin_token')?.value === process.env.ADMIN_GENERAL_SECRET
}

// POST: Promover alumnos seleccionados de un grupo a otro (soft-delete preserva historial)
// Body: { alumnoIds, sourceGrupoId, targetGrupoId }
export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { alumnoIds, sourceGrupoId, targetGrupoId, eliminarSinEntregas } = await request.json()

  if (!alumnoIds?.length || !sourceGrupoId || !targetGrupoId) {
    return NextResponse.json({ error: 'alumnoIds, sourceGrupoId y targetGrupoId son requeridos' }, { status: 400 })
  }
  if (sourceGrupoId === targetGrupoId) {
    return NextResponse.json({ error: 'Origen y destino no pueden ser el mismo grupo' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Soft-delete en el grupo de origen
  const { error: softErr } = await admin
    .from('grupo_alumnos')
    .update({ activo: false, fecha_egreso: new Date().toISOString() })
    .eq('grupo_id', sourceGrupoId)
    .in('alumno_id', alumnoIds)
    .eq('activo', true)

  if (softErr) return NextResponse.json({ error: softErr.message }, { status: 500 })

  // Insertar en el grupo destino (upsert por si ya tenían registro previo ahí)
  const rows = alumnoIds.map((id: string) => ({
    grupo_id: targetGrupoId,
    alumno_id: id,
    activo: true,
    fecha_ingreso: new Date().toISOString(),
  }))

  const { error: insertErr } = await admin
    .from('grupo_alumnos')
    .upsert(rows, { onConflict: 'grupo_id,alumno_id' })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Limpieza opcional: eliminar alumnos sin ninguna entrega del grupo origen
  let eliminados = 0
  if (eliminarSinEntregas && Array.isArray(eliminarSinEntregas) && eliminarSinEntregas.length > 0) {
    // Verificar que realmente no tengan entregas
    const { data: conEntregas } = await admin
      .from('entregas')
      .select('alumno_id')
      .in('alumno_id', eliminarSinEntregas)

    const conEntregasSet = new Set((conEntregas ?? []).map((e: any) => e.alumno_id))
    const sinEntregasReal = eliminarSinEntregas.filter((id: string) => !conEntregasSet.has(id))

    if (sinEntregasReal.length > 0) {
      await admin.from('perfiles').delete().in('id', sinEntregasReal)
      eliminados = sinEntregasReal.length
    }
  }

  return NextResponse.json({ ok: true, promovidos: alumnoIds.length, eliminados })
}
