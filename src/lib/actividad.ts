// Cálculo de la actividad de catequistas. Se mantiene puro y sin acceso a
// datos a propósito: así puede probarse contra un volcado de producción sin
// levantar ninguna base. La página solo trae filas y llama aquí.

export interface Grupo { id: string; nombre: string; catequista_id: string | null }
export interface Catequista { id: string; nombre: string; apellido: string; user_id: string | null }
export interface Miembro { grupo_id: string; alumno_id: string }
export interface Entrega { id: string; alumno_id: string; fecha_entrega: string | null }
export interface Comentario {
  entrega_id: string
  catequista_id: string
  fecha_comentario: string
  publicado: boolean
}

export interface DatosActividad {
  grupos: Grupo[]
  catequistas: Catequista[]
  miembros: Miembro[]
  entregas: Entrega[]
  comentarios: Comentario[]
  /** user_id de auth → fecha ISO del último acceso */
  ultimoAcceso?: Record<string, string | null>
}

export type EstadoCatequista = 'al-dia' | 'se-acumula' | 'sin-retro' | 'sin-entregas'

export interface FilaActividad {
  grupoId: string
  grupoNombre: string
  catequista: Catequista | null
  alumnosTotal: number
  alumnosQueEntregaron: number
  entregasRecibidas: number
  entregasRespondidas: number
  /** 0–1, o null si no llegó ninguna entrega */
  cobertura: number | null
  /** media de días entre la entrega y su primera retro, o null */
  diasRespuesta: number | null
  ultimaRetro: string | null
  ultimoAcceso: string | null
  estado: EstadoCatequista
}

export interface ResumenActividad {
  entregasRecibidas: number
  entregasRespondidas: number
  cobertura: number | null
  gruposSinRetro: number
  filas: FilaActividad[]
}

const DIA_MS = 86_400_000

// Un grupo está «al día» cuando ha respondido al menos 4 de cada 5 entregas.
// No se exige el 100% porque siempre hay entregas recién llegadas.
const UMBRAL_AL_DIA = 0.8

export function calcularActividad(datos: DatosActividad): ResumenActividad {
  const { grupos, catequistas, miembros, entregas, comentarios, ultimoAcceso = {} } = datos

  const catequistaPorId = new Map(catequistas.map(c => [c.id, c]))
  const entregaPorId = new Map(entregas.map(e => [e.id, e]))

  // Comentarios publicados agrupados por entrega y ordenados: el primero es el
  // que cuenta para medir cuánto se tardó en responder.
  const retrosPorEntrega = new Map<string, Comentario[]>()
  for (const c of comentarios) {
    if (!c.publicado) continue
    if (!entregaPorId.has(c.entrega_id)) continue
    const lista = retrosPorEntrega.get(c.entrega_id)
    if (lista) lista.push(c)
    else retrosPorEntrega.set(c.entrega_id, [c])
  }
  for (const lista of retrosPorEntrega.values()) {
    lista.sort((a, b) => +new Date(a.fecha_comentario) - +new Date(b.fecha_comentario))
  }

  const alumnosPorGrupo = new Map<string, string[]>()
  for (const m of miembros) {
    const lista = alumnosPorGrupo.get(m.grupo_id)
    if (lista) lista.push(m.alumno_id)
    else alumnosPorGrupo.set(m.grupo_id, [m.alumno_id])
  }

  const entregasPorAlumno = new Map<string, Entrega[]>()
  for (const e of entregas) {
    const lista = entregasPorAlumno.get(e.alumno_id)
    if (lista) lista.push(e)
    else entregasPorAlumno.set(e.alumno_id, [e])
  }

  const filas: FilaActividad[] = grupos.map(g => {
    const catequista = g.catequista_id ? catequistaPorId.get(g.catequista_id) ?? null : null
    const alumnos = alumnosPorGrupo.get(g.id) ?? []

    const entregasGrupo: Entrega[] = []
    const alumnosConEntrega = new Set<string>()
    for (const alumnoId of alumnos) {
      const suyas = entregasPorAlumno.get(alumnoId)
      if (!suyas?.length) continue
      alumnosConEntrega.add(alumnoId)
      entregasGrupo.push(...suyas)
    }

    let respondidas = 0
    let sumaDias = 0
    let conDemoraMedible = 0
    let ultimaRetro: number | null = null

    for (const e of entregasGrupo) {
      const retros = retrosPorEntrega.get(e.id)
      if (!retros?.length) continue
      // Solo cuenta la retro del catequista asignado a este grupo: se mide su
      // trabajo, no el de quien pase por ahí.
      const suyas = catequista ? retros.filter(r => r.catequista_id === catequista.id) : []
      if (!suyas.length) continue

      respondidas++
      const primera = +new Date(suyas[0].fecha_comentario)
      const ultima = +new Date(suyas[suyas.length - 1].fecha_comentario)
      if (ultimaRetro === null || ultima > ultimaRetro) ultimaRetro = ultima

      if (e.fecha_entrega) {
        const demora = primera - +new Date(e.fecha_entrega)
        // Una retro anterior a la entrega es un dato raro, no una demora
        // negativa: se descarta del promedio en vez de falsearlo.
        if (demora >= 0) { sumaDias += demora / DIA_MS; conDemoraMedible++ }
      }
    }

    const recibidas = entregasGrupo.length
    const cobertura = recibidas > 0 ? respondidas / recibidas : null

    let estado: EstadoCatequista
    if (recibidas === 0) estado = 'sin-entregas'
    else if (cobertura! >= UMBRAL_AL_DIA) estado = 'al-dia'
    else if (respondidas > 0) estado = 'se-acumula'
    else estado = 'sin-retro'

    return {
      grupoId: g.id,
      grupoNombre: g.nombre,
      catequista,
      alumnosTotal: alumnos.length,
      alumnosQueEntregaron: alumnosConEntrega.size,
      entregasRecibidas: recibidas,
      entregasRespondidas: respondidas,
      cobertura,
      diasRespuesta: conDemoraMedible > 0 ? sumaDias / conDemoraMedible : null,
      ultimaRetro: ultimaRetro !== null ? new Date(ultimaRetro).toISOString() : null,
      ultimoAcceso: catequista?.user_id ? ultimoAcceso[catequista.user_id] ?? null : null,
      estado,
    }
  })

  // Arriba lo que necesita atención: primero sin retro, luego lo que se acumula.
  const orden: Record<EstadoCatequista, number> = {
    'sin-retro': 0, 'se-acumula': 1, 'al-dia': 2, 'sin-entregas': 3,
  }
  filas.sort((a, b) =>
    orden[a.estado] - orden[b.estado] ||
    (a.cobertura ?? 1) - (b.cobertura ?? 1) ||
    a.grupoNombre.localeCompare(b.grupoNombre))

  const recibidas = filas.reduce((n, f) => n + f.entregasRecibidas, 0)
  const respondidas = filas.reduce((n, f) => n + f.entregasRespondidas, 0)

  return {
    entregasRecibidas: recibidas,
    entregasRespondidas: respondidas,
    cobertura: recibidas > 0 ? respondidas / recibidas : null,
    gruposSinRetro: filas.filter(f => f.estado === 'sin-retro').length,
    filas,
  }
}

/**
 * Red de seguridad contra fugas entre colegios.
 *
 * Esta pantalla lee con la clave de servicio, que ignora las políticas RLS: el
 * único filtro por colegio es el que pone el código. Y ni `entregas` ni
 * `comentarios` tienen columna `colegio_id`, así que su acotación es indirecta
 * (solo están limitadas porque la lista de alumnos venía limitada). Si una
 * consulta perdiera ese filtro traería datos de otros colegios sin dar ningún
 * error. Esto convierte esa fuga silenciosa en un fallo visible.
 */
export function verificarAlcance(datos: DatosActividad): void {
  const alumnos = new Set(datos.miembros.map(m => m.alumno_id))
  const ajena = datos.entregas.find(e => !alumnos.has(e.alumno_id))
  if (ajena) {
    throw new Error(
      `Fuga de alcance: la entrega ${ajena.id} es del alumno ${ajena.alumno_id}, ` +
      `que no pertenece a ningún grupo de este colegio.`
    )
  }

  const entregasPropias = new Set(datos.entregas.map(e => e.id))
  const suelto = datos.comentarios.find(c => !entregasPropias.has(c.entrega_id))
  if (suelto) {
    throw new Error(
      `Fuga de alcance: el comentario sobre la entrega ${suelto.entrega_id} ` +
      `no corresponde a ninguna entrega de este colegio.`
    )
  }
}
