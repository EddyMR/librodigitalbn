import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFecha(date: string | Date, pattern = 'dd/MM/yyyy') {
  return format(new Date(date), pattern, { locale: es })
}

export function formatRelativo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatFechaHora(date: string | Date) {
  return format(new Date(date), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
}

export function avatarUrl(avatarId: number) {
  return `/avatars/avatar-${avatarId}.png`
}

export function nombreCompleto(perfil: { nombre: string; apellido: string }) {
  return `${perfil.nombre} ${perfil.apellido}`
}

export function iniciales(perfil: { nombre: string; apellido: string }) {
  return `${perfil.nombre[0]}${perfil.apellido[0]}`.toUpperCase()
}

export function porcentaje(parte: number, total: number) {
  if (total === 0) return 0
  return Math.round((parte / total) * 100)
}

export function colorRolBadge(rol: string) {
  switch (rol) {
    case 'alumno': return 'bg-brand-100 text-brand-800'
    case 'catequista': return 'bg-gold-100 text-gold-800'
    case 'admin_colegio': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export function labelRol(rol: string) {
  switch (rol) {
    case 'alumno': return 'Alumno'
    case 'catequista': return 'Catequista'
    case 'admin_colegio': return 'Administrador'
    default: return rol
  }
}
