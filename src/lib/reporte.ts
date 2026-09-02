// Diagnóstico de colegios para el administrador general. Puro y sin acceso a
// datos, para poder probarlo contra un volcado sin levantar ninguna base.
//
// La idea no es enseñar cifras sino responder a una pregunta: ¿a quién tengo
// que atender esta semana, y por qué? Un colegio al 0% puede estar así porque
// nadie entra o porque le falta configuración. Son problemas opuestos y se
// arreglan de forma distinta, así que se distinguen.

export interface ColegioBruto {
  id: string
  codigo: string
  nombre: string
  activo: boolean
  created_at: string
}
export interface PerfilBruto {
  id: string
  colegio_id: string | null
  rol: 'alumno' | 'catequista' | 'admin_colegio'
  nombre: string
  apellido: string
}
export interface GrupoBruto {
  id: string
  colegio_id: string
  catequista_id: string | null
  activo: boolean
}
/** Una fila por cada libro asignado a un grupo */
export interface LibroGrupoBruto { grupo_id: string }
/** Solo se pide alumno_id: basta para saber quién estuvo activo */
export interface EntregaBruta { alumno_id: string }

export interface DatosReporte {
  colegios: ColegioBruto[]
  perfiles: PerfilBruto[]
  grupos: GrupoBruto[]
  libroGrupos: LibroGrupoBruto[]
  entregasRecientes: EntregaBruta[]
}

export type EstadoColegio =
  | 'sin-configurar'  // TIENE alumnos, pero algo les impide trabajar
  | 'sin-arrancar'    // puede usarse, pero nadie ha entregado nada
  | 'flojea'          // se usa poco
  | 'va-bien'
  | 'sin-alumnos'     // creado, aún sin dar de alta a nadie: nada que medir
  | 'inactivo'        // dado de baja

export interface FilaColegio {
  id: string
  codigo: string
  nombre: string
  activo: boolean
  creado: string
  diasDesdeAlta: number
  alumnos: number
  catequistas: number
  admins: { nombre: string; apellido: string }[]
  grupos: number
  gruposSinCatequista: number
  gruposSinLibro: number
  alumnosActivos: number
  /** 0–1, o null si el colegio no tiene alumnos */
  adopcion: number | null
  /** Impide que el alumno pueda trabajar */
  faltas: string[]
  /** No impide usar la plataforma, pero limita el seguimiento */
  avisos: string[]
  estado: EstadoColegio
}

export interface Reporte {
  totalColegios: number
  colegiosActivos: number
  totalAlumnos: number
  totalCatequistas: number
  totalAdmins: number
  alumnosActivos: number
  /** Alumnos activos sobre el total, no la media de porcentajes: una media
   *  entre un colegio al 90% y otro al 0% da 45% y no dice nada de ninguno. */
  adopcionGlobal: number | null
  /** Colegios listos que no están trabajando. Los que aún no tienen alumnos
   *  quedan fuera: son trabajo pendiente, no un problema, y si contaran
   *  ahogarían la señal de los que sí deberían estar produciendo. */
  necesitanAtencion: number
  sinAlumnosTodavia: number
  filas: FilaColegio[]
}

// A partir de aquí se considera que un colegio va bien. No se pide más porque
// nunca entrega el 100% de un grupo en un mes cualquiera.
const UMBRAL_VA_BIEN = 0.6

const DIA_MS = 86_400_000

export function construirReporte(datos: DatosReporte, ahora = Date.now()): Reporte {
  const { colegios, perfiles, grupos, libroGrupos, entregasRecientes } = datos

  const colegioDeAlumno = new Map<string, string>()
  for (const p of perfiles) {
    if (p.rol === 'alumno' && p.colegio_id) colegioDeAlumno.set(p.id, p.colegio_id)
  }

  // Alumnos distintos con al menos una entrega en la ventana, por colegio
  const activosPorColegio = new Map<string, Set<string>>()
  for (const e of entregasRecientes) {
    const colegioId = colegioDeAlumno.get(e.alumno_id)
    if (!colegioId) continue
    const set = activosPorColegio.get(colegioId)
    if (set) set.add(e.alumno_id)
    else activosPorColegio.set(colegioId, new Set([e.alumno_id]))
  }

  const gruposConLibro = new Set(libroGrupos.map(lg => lg.grupo_id))

  const filas: FilaColegio[] = colegios.map(c => {
    const suyos = perfiles.filter(p => p.colegio_id === c.id)
    const alumnos = suyos.filter(p => p.rol === 'alumno').length
    const catequistas = suyos.filter(p => p.rol === 'catequista').length
    const admins = suyos
      .filter(p => p.rol === 'admin_colegio')
      .map(p => ({ nombre: p.nombre, apellido: p.apellido }))

    const susGrupos = grupos.filter(g => g.colegio_id === c.id && g.activo)
    const gruposSinCatequista = susGrupos.filter(g => !g.catequista_id).length
    const gruposSinLibro = susGrupos.filter(g => !gruposConLibro.has(g.id)).length

    const activos = activosPorColegio.get(c.id)?.size ?? 0
    const adopcion = alumnos > 0 ? activos / alumnos : null

    // Lo que impide trabajar a unos alumnos que YA existen. No incluye «sin
    // alumnos»: eso es un estado propio, porque un colegio recién creado y uno
    // con 119 alumnos parados no son el mismo problema.
    const faltas: string[] = []
    if (alumnos > 0) {
      if (susGrupos.length === 0) faltas.push('sin grupos')
      else if (gruposSinLibro === susGrupos.length) faltas.push('sin libros asignados')
    }

    // Limita el seguimiento, pero el alumno sí puede usar la plataforma.
    const avisos: string[] = []
    if (admins.length === 0) avisos.push('sin administrador')
    if (gruposSinCatequista > 0) {
      avisos.push(
        gruposSinCatequista === 1
          ? '1 grupo sin catequista'
          : `${gruposSinCatequista} grupos sin catequista`
      )
    }
    if (susGrupos.length > 0 && gruposSinLibro > 0 && gruposSinLibro < susGrupos.length) {
      avisos.push(`${gruposSinLibro} sin libro asignado`)
    }

    let estado: EstadoColegio
    if (!c.activo) estado = 'inactivo'
    else if (alumnos === 0) estado = 'sin-alumnos'
    else if (faltas.length > 0) estado = 'sin-configurar'
    else if (activos === 0) estado = 'sin-arrancar'
    else if (adopcion! >= UMBRAL_VA_BIEN) estado = 'va-bien'
    else estado = 'flojea'

    return {
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      activo: c.activo,
      creado: c.created_at,
      diasDesdeAlta: Math.max(0, Math.floor((ahora - +new Date(c.created_at)) / DIA_MS)),
      alumnos,
      catequistas,
      admins,
      grupos: susGrupos.length,
      gruposSinCatequista,
      gruposSinLibro,
      alumnosActivos: activos,
      adopcion,
      faltas,
      avisos,
      estado,
    }
  })

  // Triaje: primero lo que exige que hagas algo, al final lo que va solo.
  const orden: Record<EstadoColegio, number> = {
    'sin-configurar': 0, 'sin-arrancar': 1, 'flojea': 2, 'va-bien': 3,
    'sin-alumnos': 4, 'inactivo': 5,
  }
  filas.sort((a, b) =>
    orden[a.estado] - orden[b.estado] ||
    (a.adopcion ?? 0) - (b.adopcion ?? 0) ||
    b.alumnos - a.alumnos ||
    a.nombre.localeCompare(b.nombre))

  const activosTotal = filas.reduce((n, f) => n + f.alumnosActivos, 0)
  const alumnosTotal = perfiles.filter(p => p.rol === 'alumno').length

  return {
    totalColegios: colegios.length,
    colegiosActivos: colegios.filter(c => c.activo).length,
    totalAlumnos: alumnosTotal,
    totalCatequistas: perfiles.filter(p => p.rol === 'catequista').length,
    totalAdmins: perfiles.filter(p => p.rol === 'admin_colegio').length,
    alumnosActivos: activosTotal,
    adopcionGlobal: alumnosTotal > 0 ? activosTotal / alumnosTotal : null,
    necesitanAtencion: filas.filter(
      f => f.estado === 'sin-configurar' || f.estado === 'sin-arrancar'
    ).length,
    sinAlumnosTodavia: filas.filter(f => f.estado === 'sin-alumnos').length,
    filas,
  }
}
