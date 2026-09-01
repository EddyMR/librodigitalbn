import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { nombreCompleto, formatRelativo, cn } from '@/lib/utils'
import { calcularActividad, verificarAlcance } from '@/lib/actividad'
import type { DatosActividad, FilaActividad, EstadoCatequista } from '@/lib/actividad'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Actividad de catequistas' }

const DIAS_VENTANA = 30

// PostgREST manda los filtros .in() en la URL. Con más de ~200 identificadores
// se supera el límite de longitud y la petición falla, así que se trocea.
const LOTE = 150

interface Props { params: Promise<{ colegio: string }> }

async function enLotes<T>(ids: string[], fn: (lote: string[]) => Promise<T[]>): Promise<T[]> {
  const salida: T[] = []
  for (let i = 0; i < ids.length; i += LOTE) {
    salida.push(...await fn(ids.slice(i, i + LOTE)))
  }
  return salida
}

export default async function ActividadPage({ params }: Props) {
  const { colegio: codigo } = await params
  const perfil = await getSession()
  if (!perfil || perfil.rol !== 'admin_colegio') redirect(`/${codigo}/login`)

  // El colegio sale SIEMPRE de la sesión, nunca de la URL. Si no coinciden se
  // redirige: sin esto un administrador vería sus propios datos bajo el código
  // de otro colegio, que no es una fuga pero despista.
  const colegioId = perfil.colegio_id
  if (perfil.colegio?.codigo && perfil.colegio.codigo !== codigo) {
    redirect(`/${perfil.colegio.codigo}/actividad`)
  }

  const admin = createAdminClient()
  const desde = new Date(Date.now() - DIAS_VENTANA * 86_400_000).toISOString()

  const [{ data: gruposRaw }, { data: catequistasRaw }] = await Promise.all([
    admin.from('grupos')
      .select('id, nombre, catequista_id')
      .eq('colegio_id', colegioId)
      .eq('activo', true)
      .order('nombre'),
    admin.from('perfiles')
      .select('id, nombre, apellido, user_id')
      .eq('colegio_id', colegioId)
      .eq('rol', 'catequista'),
  ])

  const grupos = gruposRaw ?? []
  const catequistas = catequistasRaw ?? []
  const grupoIds = grupos.map(g => g.id)

  const miembros = grupoIds.length
    ? await enLotes(grupoIds, async lote => {
        const { data } = await admin.from('grupo_alumnos')
          .select('grupo_id, alumno_id')
          .in('grupo_id', lote)
          .eq('activo', true)
        return data ?? []
      })
    : []

  const alumnoIds = [...new Set(miembros.map(m => m.alumno_id))]

  const entregas = alumnoIds.length
    ? await enLotes(alumnoIds, async lote => {
        const { data } = await admin.from('entregas')
          // Nunca se pide `contenido`: es el jsonb con las respuestas del
          // alumno y multiplicaría el peso de la consulta sin aportar nada.
          .select('id, alumno_id, fecha_entrega')
          .in('alumno_id', lote)
          .eq('estado', 'entregado')
          .gte('fecha_entrega', desde)
        return data ?? []
      })
    : []

  const entregaIds = entregas.map(e => e.id)

  const comentarios = entregaIds.length
    ? await enLotes(entregaIds, async lote => {
        const { data } = await admin.from('comentarios')
          // Tampoco se pide `contenido`: es el texto de la retro y aquí solo
          // se cuenta que exista.
          .select('entrega_id, catequista_id, fecha_comentario, publicado')
          .in('entrega_id', lote)
        return data ?? []
      })
    : []

  // Último acceso. perPage al máximo: 1250 usuarios son 2 peticiones, no 25.
  const ultimoAcceso: Record<string, string | null> = {}
  const userIds = new Set(catequistas.map(c => c.user_id).filter(Boolean))
  if (userIds.size) {
    for (let pagina = 1; pagina <= 10; pagina++) {
      const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 })
      if (error || !data?.users?.length) break
      for (const u of data.users) {
        if (userIds.has(u.id)) ultimoAcceso[u.id] = u.last_sign_in_at ?? null
      }
      if (data.users.length < 1000) break
    }
  }

  const datos: DatosActividad = { grupos, catequistas, miembros, entregas, comentarios, ultimoAcceso }

  // Red de seguridad: si algo llegó fuera del colegio, se rompe la página en
  // vez de mostrar datos ajenos.
  verificarAlcance(datos)

  const resumen = calcularActividad(datos)
  const conCatequista = resumen.filas.filter(f => f.catequista)

  return (
    <div className="space-y-5 px-4 pt-4 pb-24">
      <div className="flex items-center gap-3">
        <Link href={`/${codigo}/dashboard`} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Actividad de catequistas</h1>
          <p className="text-xs text-slate-500">
            Últimos {DIAS_VENTANA} días · {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Resumen valor={resumen.entregasRecibidas} etiqueta="Entregas recibidas" color="text-brand-600" />
        <Resumen
          valor={resumen.cobertura === null ? '—' : `${Math.round(resumen.cobertura * 100)}%`}
          etiqueta="Con retro"
          color={resumen.cobertura !== null && resumen.cobertura >= 0.8 ? 'text-green-600' : 'text-amber-600'}
        />
        <Resumen
          valor={resumen.gruposSinRetro}
          etiqueta="Sin responder"
          color={resumen.gruposSinRetro > 0 ? 'text-red-600' : 'text-slate-400'}
        />
      </div>

      {conCatequista.length === 0 ? (
        <div className="card p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-800">Todavía no hay nada que mostrar</p>
          <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
            {grupos.length === 0
              ? 'Este colegio aún no tiene grupos activos.'
              : 'Ningún grupo tiene catequista asignado, así que no hay a quién medir.'}
          </p>
          {grupos.length > 0 && (
            <Link href={`/${codigo}/grupos`} className="btn-primary inline-flex mt-4 text-sm">
              Asignar catequistas
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {conCatequista.map(f => <Tarjeta key={f.grupoId} fila={f} />)}
        </div>
      )}

      {resumen.filas.some(f => !f.catequista) && (
        <p className="text-xs text-slate-400 px-1">
          {resumen.filas.filter(f => !f.catequista).length} grupo(s) sin catequista asignado no aparecen aquí.
        </p>
      )}
    </div>
  )
}

function Resumen({ valor, etiqueta, color }: { valor: number | string; etiqueta: string; color: string }) {
  return (
    <div className="card p-4 text-center">
      <p className={cn('text-2xl font-bold tabular-nums', color)}>{valor}</p>
      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{etiqueta}</p>
    </div>
  )
}

const ETIQUETA: Record<EstadoCatequista, { texto: string; clase: string; barra: string }> = {
  'al-dia': { texto: 'Al día', clase: 'bg-green-100 text-green-700', barra: 'bg-green-500' },
  'se-acumula': { texto: 'Se acumula', clase: 'bg-amber-100 text-amber-700', barra: 'bg-amber-500' },
  'sin-retro': { texto: 'Sin retro', clase: 'bg-red-100 text-red-700', barra: 'bg-red-500' },
  'sin-entregas': { texto: 'Sin entregas', clase: 'bg-slate-100 text-slate-500', barra: 'bg-slate-300' },
}

function Tarjeta({ fila }: { fila: FilaActividad }) {
  const e = ETIQUETA[fila.estado]
  const pct = fila.cobertura === null ? 0 : Math.round(fila.cobertura * 100)

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-[15px] truncate">
            {fila.catequista ? nombreCompleto(fila.catequista) : 'Sin catequista'}
          </p>
          <p className="text-xs text-slate-400 truncate">{fila.grupoNombre}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Último acceso: {fila.ultimoAcceso ? formatRelativo(fila.ultimoAcceso) : 'nunca'}
          </p>
        </div>
        <span className={cn('text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap', e.clase)}>
          {e.texto}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs text-slate-500 mb-1.5">
          <span>Entregas respondidas</span>
          <span className="font-semibold text-slate-700 tabular-nums">
            {fila.entregasRespondidas} / {fila.entregasRecibidas}
          </span>
        </div>
        <div className="h-[7px] rounded-full bg-slate-100 overflow-hidden">
          <div className={cn('h-full rounded-full', e.barra)} style={{ width: `${Math.max(pct, 2)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <Mini
          valor={`${fila.alumnosQueEntregaron}/${fila.alumnosTotal}`}
          etiqueta={<>alumnos<br />entregaron</>}
        />
        <Mini
          valor={fila.diasRespuesta === null ? '—' : `${fila.diasRespuesta.toFixed(1)} d`}
          etiqueta={<>respuesta<br />media</>}
        />
        <Mini
          valor={fila.ultimaRetro ? formatRelativo(fila.ultimaRetro) : 'nunca'}
          etiqueta={<>última<br />retro</>}
        />
      </div>
    </div>
  )
}

function Mini({ valor, etiqueta }: { valor: string; etiqueta: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="text-[13px] font-bold text-slate-800 tabular-nums font-mono truncate">{valor}</p>
      <p className="text-[9.5px] text-slate-400 leading-tight mt-0.5">{etiqueta}</p>
    </div>
  )
}
