import Link from 'next/link'
import { AlertTriangle, Building2, TrendingUp, Users } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase'
import { exigirAdminGeneral } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { construirReporte } from '@/lib/reporte'
import type { FilaColegio, EstadoColegio, EntregaBruta } from '@/lib/reporte'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Estado de los colegios' }

const DIAS_VENTANA = 30
// PostgREST devuelve como mucho 1000 filas por petición. Sin paginar, un
// informe con más de mil entregas mentiría por lo bajo sin avisar de nada.
const PAGINA = 1000

export default async function ReportePage() {
  // Solo el administrador general. El middleware ya cierra /admin, pero esta
  // segunda cerradura se comprueba antes de tocar ningún dato: si el matcher
  // del middleware cambiara, la página no quedaría abierta.
  await exigirAdminGeneral()

  const admin = createAdminClient()
  const desde = new Date(Date.now() - DIAS_VENTANA * 86_400_000).toISOString()

  const [
    { data: colegios },
    { data: perfiles },
    { data: grupos },
    { data: libroGrupos },
  ] = await Promise.all([
    admin.from('colegios').select('id, codigo, nombre, activo, created_at'),
    // Cinco columnas para ~1250 filas: de aquí salen todos los recuentos por
    // rol y los nombres de los administradores, en una sola consulta.
    admin.from('perfiles').select('id, colegio_id, rol, nombre, apellido'),
    admin.from('grupos').select('id, colegio_id, catequista_id, activo'),
    admin.from('libro_grupos').select('grupo_id'),
  ])

  const entregasRecientes: EntregaBruta[] = []
  for (let desplazamiento = 0; ; desplazamiento += PAGINA) {
    const { data, error } = await admin.from('entregas')
      .select('alumno_id')
      .eq('estado', 'entregado')
      .gte('fecha_entrega', desde)
      .range(desplazamiento, desplazamiento + PAGINA - 1)
    if (error || !data?.length) break
    entregasRecientes.push(...data)
    if (data.length < PAGINA) break
  }

  const r = construirReporte({
    colegios: colegios ?? [],
    perfiles: (perfiles ?? []) as any,
    grupos: grupos ?? [],
    libroGrupos: libroGrupos ?? [],
    entregasRecientes,
  })

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Estado de los colegios</h1>
          <p className="text-slate-400 text-sm">Actividad de los últimos {DIAS_VENTANA} días</p>
        </div>
        <Link href="/admin/dashboard" className="text-slate-400 hover:text-white text-sm">← Panel</Link>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">

        <div className="grid grid-cols-2 gap-4">
          <Global
            icono={Building2}
            valor={`${r.colegiosActivos}`}
            etiqueta={r.totalColegios === r.colegiosActivos
              ? 'Colegios activos'
              : `Colegios activos · ${r.totalColegios - r.colegiosActivos} de baja`}
            color="bg-brand-100 text-brand-700"
          />
          <Global
            icono={Users}
            valor={`${r.totalAlumnos}`}
            etiqueta={`Alumnos · ${r.totalCatequistas} catequistas`}
            color="bg-green-100 text-green-700"
          />
          <Global
            icono={TrendingUp}
            valor={r.adopcionGlobal === null ? '—' : `${Math.round(r.adopcionGlobal * 100)}%`}
            etiqueta={`Entregaron algo · ${r.alumnosActivos} de ${r.totalAlumnos}`}
            color="bg-purple-100 text-purple-700"
          />
          <Global
            icono={AlertTriangle}
            valor={`${r.necesitanAtencion}`}
            etiqueta="Necesitan atención"
            color={r.necesitanAtencion > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}
          />
        </div>

        {r.adopcionGlobal !== null && r.filas.length > 1 && (
          <p className="text-xs text-slate-400 -mt-2">
            El porcentaje global son alumnos activos sobre el total, no la media entre colegios:
            promediar un colegio al 90% con otro al 0% daría 45% y no describiría a ninguno.
          </p>
        )}

        {r.filas.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-semibold text-slate-800">Todavía no hay colegios</p>
            <Link href="/admin/colegios" className="btn-primary inline-flex mt-4 text-sm">
              Crear el primero
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {r.filas.map(f => <Colegio key={f.id} fila={f} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function Global({ icono: Icono, valor, etiqueta, color }: {
  icono: React.ElementType; valor: string; etiqueta: string; color: string
}) {
  return (
    <div className="card p-5 space-y-3">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icono className="w-5 h-5" />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{valor}</p>
        <p className="text-sm text-slate-500 leading-tight">{etiqueta}</p>
      </div>
    </div>
  )
}

const ESTADO: Record<EstadoColegio, { texto: string; pill: string; barra: string }> = {
  'sin-configurar': { texto: 'Falta configurar', pill: 'bg-red-100 text-red-700', barra: 'bg-red-500' },
  'sin-arrancar': { texto: 'Sin arrancar', pill: 'bg-amber-100 text-amber-700', barra: 'bg-amber-500' },
  'flojea': { texto: 'Flojea', pill: 'bg-gold-100 text-gold-700', barra: 'bg-gold-500' },
  'va-bien': { texto: 'Va bien', pill: 'bg-green-100 text-green-700', barra: 'bg-green-500' },
  'inactivo': { texto: 'De baja', pill: 'bg-slate-100 text-slate-500', barra: 'bg-slate-300' },
}

function Colegio({ fila: f }: { fila: FilaColegio }) {
  const e = ESTADO[f.estado]
  const pct = f.adopcion === null ? 0 : Math.round(f.adopcion * 100)

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate">{f.nombre}</p>
          <p className="text-xs text-slate-400 font-mono">{f.codigo}</p>
        </div>
        <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap', e.pill)}>
          {e.texto}
        </span>
      </div>

      {f.faltas.length > 0 && (
        <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
          <p className="text-xs font-semibold text-red-800">
            Los alumnos no pueden trabajar todavía
          </p>
          <p className="text-xs text-red-700 mt-0.5">{f.faltas.join(' · ')}</p>
        </div>
      )}

      {f.estado !== 'sin-configurar' && f.alumnos > 0 && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs text-slate-500 mb-1.5">
            <span>Alumnos que entregaron</span>
            <span className="font-semibold text-slate-700 tabular-nums">
              {f.alumnosActivos} / {f.alumnos} · {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={cn('h-full rounded-full', e.barra)} style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <Dato valor={f.alumnos} etiqueta="alumnos" />
        <Dato valor={f.catequistas} etiqueta="catequistas" />
        <Dato valor={f.grupos} etiqueta={f.grupos === 1 ? 'grupo' : 'grupos'} />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
        <p className="text-xs text-slate-500">
          <span className="text-slate-400">Administra: </span>
          {f.admins.length === 0
            ? <span className="text-amber-700 font-medium">nadie asignado</span>
            : f.admins.map(a => `${a.nombre} ${a.apellido}`).join(', ')}
        </p>
        {f.avisos.length > 0 && (
          <p className="text-xs text-amber-700">{f.avisos.join(' · ')}</p>
        )}
        <p className="text-[11px] text-slate-400">
          Dado de alta hace {f.diasDesdeAlta === 0 ? 'menos de un día' : `${f.diasDesdeAlta} días`}
        </p>
      </div>
    </div>
  )
}

function Dato({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <p className="text-lg font-bold text-slate-800 tabular-nums leading-none">{valor}</p>
      <p className="text-[11px] text-slate-400 mt-1">{etiqueta}</p>
    </div>
  )
}
