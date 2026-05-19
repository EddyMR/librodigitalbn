'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from './supabase'
import { Perfil, RolUsuario } from '@/types'
import crypto from 'crypto'

// ── Get current user profile ──────────────────────────────────
export async function getSession() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*, colegio:colegios(*)')
    .eq('user_id', user.id)
    .single()

  return perfil as Perfil | null
}

// ── Login with username/password (alumno) ────────────────────
export async function loginAlumno(
  codigoOrId: string,
  username: string,
  password: string
) {
  const admin = createAdminClient()

  // Get the profile to find the auth email we stored
  const { data: perfil } = await admin
    .from('perfiles')
    .select('*, colegio:colegios!inner(codigo)')
    .eq('username', username)
    .eq('activo', true)
    .single()

  if (!perfil) return { error: 'Usuario o contraseña incorrectos' }

  // Auth uses a synthetic email: username@colegio-codigo.catequesis
  const syntheticEmail = `${username}@${perfil.colegio.codigo}.catequesis`

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  })

  if (error) return { error: 'Usuario o contraseña incorrectos' }
  return { ok: true, rol: perfil.rol as RolUsuario, colegioCodigo: perfil.colegio.codigo }
}

// ── Login with email/password (catequista / admin_colegio) ────
export async function loginEmail(email: string, password: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Credenciales incorrectas' }

  const perfil = await getSession()
  if (!perfil) return { error: 'No se encontró el perfil' }

  return { ok: true, rol: perfil.rol, colegioCodigo: perfil.colegio?.codigo }
}

// ── Login via QR token ────────────────────────────────────────
export async function loginQR(token: string) {
  const admin = createAdminClient()

  const { data: qr } = await admin
    .from('qr_tokens')
    .select('*, alumno:perfiles!inner(*, colegio:colegios(*))')
    .eq('token', token)
    .eq('usado', false)
    .gt('expira_at', new Date().toISOString())
    .single()

  if (!qr) return { error: 'QR inválido o expirado' }

  // Mark as used
  await admin.from('qr_tokens').update({ usado: true }).eq('id', qr.id)

  // Generate a magic sign-in for the alumno (exchange for session)
  const { data: link } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: `${qr.alumno.username}@${qr.alumno.colegio.codigo}.catequesis`,
  })

  return { ok: true, magicLink: link?.properties?.action_link, colegioCodigo: qr.alumno.colegio.codigo }
}

// ── Logout ────────────────────────────────────────────────────
export async function logout() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/')
}

// ── Create alumno ─────────────────────────────────────────────
export async function crearAlumno(data: {
  nombre: string
  apellido: string
  email?: string
  grupoId: string
  colegioId: string
}) {
  const admin = createAdminClient()

  // Generate username: nombre.apellido (lowercase, no spaces)
  const baseUsername = `${data.nombre}.${data.apellido}`
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')

  // Ensure unique username
  let username = baseUsername
  let counter = 1
  while (true) {
    const { data: exists } = await admin.from('perfiles').select('id').eq('username', username).single()
    if (!exists) break
    username = `${baseUsername}${counter++}`
  }

  // Generate 8-char password
  const password = Math.random().toString(36).slice(-8)

  // Get colegio codigo for synthetic email
  const { data: colegio } = await admin.from('colegios').select('codigo').eq('id', data.colegioId).single()
  if (!colegio) return { error: 'Colegio no encontrado' }

  const syntheticEmail = `${username}@${colegio.codigo}.catequesis`

  // Create auth user
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
  })

  if (authError || !authUser.user) return { error: authError?.message ?? 'Error al crear usuario' }

  // Create profile
  const { data: perfil, error: perfilError } = await admin.from('perfiles').insert({
    user_id: authUser.user.id,
    colegio_id: data.colegioId,
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    username,
    rol: 'alumno',
    activo: true,
  }).select().single()

  if (perfilError) {
    await admin.auth.admin.deleteUser(authUser.user.id)
    return { error: perfilError.message }
  }

  // Add to group
  await admin.from('grupo_alumnos').insert({ grupo_id: data.grupoId, alumno_id: perfil.id })

  // TODO: Send welcome email with username & password if data.email is provided

  return { ok: true, perfil, username, password }
}

// ── Generate QR token ─────────────────────────────────────────
export async function generarQRToken(alumnoId: string) {
  const admin = createAdminClient()
  const token = crypto.randomBytes(32).toString('hex')

  const { error } = await admin.from('qr_tokens').insert({
    alumno_id: alumnoId,
    token,
    expira_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
  })

  if (error) return { error: error.message }
  return { token, url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/qr/${token}` }
}

// ── Create catequista ─────────────────────────────────────────
export async function crearCatequista(data: {
  nombre: string
  apellido: string
  email: string
  colegioId: string
}) {
  const admin = createAdminClient()

  const password = Math.random().toString(36).slice(-8)

  const { data: authUser, error } = await admin.auth.admin.createUser({
    email: data.email,
    password,
    email_confirm: true,
  })

  if (error || !authUser.user) return { error: error?.message ?? 'Error' }

  const { data: perfil } = await admin.from('perfiles').insert({
    user_id: authUser.user.id,
    colegio_id: data.colegioId,
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    rol: 'catequista',
    activo: true,
  }).select().single()

  return { ok: true, perfil, password }
}

// ── Create admin_colegio ──────────────────────────────────────
export async function crearAdminColegio(data: {
  nombre: string
  apellido: string
  email: string
  colegioId: string
}) {
  const admin = createAdminClient()

  const password = Math.random().toString(36).slice(-8)

  const { data: authUser, error } = await admin.auth.admin.createUser({
    email: data.email,
    password,
    email_confirm: true,
  })

  if (error || !authUser.user) return { error: error?.message ?? 'Error' }

  const { error: perfilError } = await admin.from('perfiles').insert({
    user_id: authUser.user.id,
    colegio_id: data.colegioId,
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    rol: 'admin_colegio',
    activo: true,
  })

  if (perfilError) {
    await admin.auth.admin.deleteUser(authUser.user.id)
    return { error: perfilError.message }
  }

  return { ok: true, email: data.email, password }
}

// ── Create multiple alumnos (bulk) ────────────────────────────
export async function crearAlumnosMasivo(data: {
  alumnos: { nombre: string; apellido: string }[]
  grupoId: string
  colegioId: string
}): Promise<{ results: Array<{ nombre: string; apellido: string; username: string; password: string; error?: string }> }> {
  const results: Array<{ nombre: string; apellido: string; username: string; password: string; error?: string }> = []

  for (const alumno of data.alumnos) {
    const res = await crearAlumno({
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      grupoId: data.grupoId,
      colegioId: data.colegioId,
    })
    if (res.error) {
      results.push({ nombre: alumno.nombre, apellido: alumno.apellido, username: '', password: '', error: res.error })
    } else {
      results.push({ nombre: alumno.nombre, apellido: alumno.apellido, username: res.username!, password: res.password! })
    }
  }

  return { results }
}
