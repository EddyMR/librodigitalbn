// ============================================================
// DATABASE TYPES
// ============================================================

export type RolUsuario = 'alumno' | 'catequista' | 'admin_colegio'
export type TipoHoja = 'lectura' | 'escritura_libre' | 'escritura_imagen' | 'foto' | 'audio' | 'cuestionario' | 'multimedia'
export type EstadoEntrega = 'borrador' | 'entregado'

export interface Colegio {
  id: string
  codigo: string
  nombre: string
  activo: boolean
  created_at: string
}

export interface Perfil {
  id: string
  user_id: string
  colegio_id: string
  nombre: string
  apellido: string
  email?: string
  username?: string
  rol: RolUsuario
  avatar_id: number
  mini_bio?: string
  activo: boolean
  created_at: string
  updated_at: string
  // joined
  colegio?: Colegio
}

export interface Grupo {
  id: string
  colegio_id: string
  nombre: string
  catequista_id?: string
  activo: boolean
  created_at: string
  // joined
  catequista?: Perfil
  alumnos?: Perfil[]
  _count?: { alumnos: number }
}

export interface Libro {
  id: string
  titulo: string
  descripcion?: string
  portada_url?: string
  orden: number
  activo: boolean
  created_at: string
  // joined
  bloques?: Bloque[]
  _count?: { bloques: number; hojas: number }
}

export interface Bloque {
  id: string
  libro_id: string
  titulo: string
  descripcion?: string
  orden: number
  activo: boolean
  // joined
  hojas?: Hoja[]
  _count?: { hojas: number }
}

export interface ZonaEscritura {
  id: string
  hoja_id: string
  x_pct: number
  y_pct: number
  width_pct: number
  height_pct: number
  placeholder?: string
  orden: number
}

export interface MediaItem {
  tipo: 'audio' | 'video'
  url: string
  video_tipo?: 'youtube' | 'upload'
}

export interface HojaConfig {
  preguntas?: string[]
  // multimedia (lista de audios/videos, en el orden en que se agregaron)
  medios?: MediaItem[]
  // legacy: hojas creadas antes del soporte multi-elemento (un solo audio/video)
  audio_url?: string
  video_url?: string
  video_tipo?: 'youtube' | 'upload'
}

export interface Hoja {
  id: string
  bloque_id: string
  titulo?: string
  imagen_url: string
  tipo: TipoHoja
  orden: number
  activo: boolean
  config?: HojaConfig
  // joined
  zonas_escritura?: ZonaEscritura[]
}

export interface LibroGrupo {
  libro_id: string
  grupo_id: string
  asignado_at: string
  activo: boolean
}

export interface VisitaHoja {
  id: string
  alumno_id: string
  hoja_id: string
  primera_visita: string
  ultima_visita: string
  visitas_count: number
}

export interface EntregaContenido {
  texto?: string                        // escritura_libre (legacy)
  dibujo_url?: string                   // escritura_libre: drawing as PNG
  zonas?: Record<string, string>        // escritura_imagen: zona_id → text
  foto_url?: string                     // foto
  audio_url?: string                    // audio
  respuestas?: string[]                 // cuestionario: indexed by pregunta order
}

export interface Entrega {
  id: string
  alumno_id: string
  hoja_id: string
  contenido: EntregaContenido
  estado: EstadoEntrega
  fecha_entrega?: string
  fecha_modificacion?: string
  // joined
  alumno?: Perfil
  comentarios?: Comentario[]
}

export interface Comentario {
  id: string
  entrega_id: string
  catequista_id: string
  contenido: string
  publicado: boolean
  fecha_comentario: string
  fecha_modificacion?: string
  // joined
  catequista?: Perfil
}

export interface QrToken {
  id: string
  alumno_id: string
  token: string
  usado: boolean
  expira_at: string
  created_at: string
}

// ============================================================
// APP-LEVEL TYPES
// ============================================================

export interface ProgresoBloqueAlumno {
  bloque: Bloque
  hojas_totales: number
  hojas_visitadas: number
  hojas_entregadas: number
  porcentaje_avance: number
}

export interface ProgresoLibroAlumno {
  libro: Libro
  hojas_totales: number
  hojas_visitadas: number
  hojas_entregadas: number
  porcentaje_avance: number
  bloques: ProgresoBloqueAlumno[]
}

export interface ResumenAlumnoParaCatequista {
  alumno: Perfil
  libros_asignados: number
  hojas_visitadas: number
  entregas_pendientes: number
  entregas_entregadas: number
  ultima_actividad?: string
}

export interface AuthState {
  perfil: Perfil | null
  colegio: Colegio | null
  loading: boolean
}

// Avatar mapping (10 avatars)
export const AVATARES = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  src: `/avatars/avatar-${i + 1}.png`,
  nombre: `Personaje ${i + 1}`,
}))
