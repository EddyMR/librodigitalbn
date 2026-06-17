'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, UserX, UserCheck, Trash2, Pencil, UserPlus, X, Copy, Check, QrCode, RefreshCw } from 'lucide-react'
import { Modal, Confirm, Toast, Badge } from '@/components/ui'
import { nombreCompleto, labelRol, colorRolBadge, formatFecha } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import QRCode from 'qrcode'

interface Colegio { id: string; nombre: string }
interface Libro { id: string; titulo: string }
interface Usuario {
  id: string
  nombre: string
  apellido: string
  email?: string
  username?: string
  rol: string
  activo: boolean
  created_at: string
  colegio_id?: string
  colegio?: { nombre: string; codigo?: string }
  grupo_alumnos?: { grupo_id: string; grupo: { id: string; nombre: string } | null }[]
}

interface Props {
  usuarios: Usuario[]
  colegios: Colegio[]
  rolFiltro?: string
  libros: Libro[]
}

const ROLES = [
  { value: '', label: 'Todos' },
  { value: 'admin_colegio', label: 'Administradores' },
  { value: 'catequista', label: 'Catequistas' },
  { value: 'alumno', label: 'Alumnos' },
  { value: 'sin_grupo', label: 'Sin grupo' },
]

export default function AdminUsuariosClient({ usuarios: initial, colegios, rolFiltro: rolInit, libros }: Props) {
  const [usuarios, setUsuarios] = useState(initial)
  const [rolFiltro, setRolFiltro] = useState(rolInit ?? '')

  useEffect(() => {
    fetch('/api/admin/usuarios')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.usuarios)) setUsuarios(data.usuarios) })
      .catch(() => {})
  }, [])
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [confirmando, setConfirmando] = useState<{ tipo: 'delete' | 'toggle'; usuario: Usuario } | null>(null)
  const [creando, setCreando] = useState(false)
  const [deleteError, setDeleteError] = useState<{ msg: string; usuario: Usuario } | null>(null)
  const [accesoAlumno, setAccesoAlumno] = useState<Usuario | null>(null)

  const sinGrupoCount = useMemo(
    () => usuarios.filter(u => u.rol === 'alumno' && !u.grupo_alumnos?.[0]?.grupo).length,
    [usuarios]
  )

  // ── Filtrado ─────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    let lista = usuarios
    if (rolFiltro === 'sin_grupo') {
      lista = lista.filter(u => u.rol === 'alumno' && !u.grupo_alumnos?.[0]?.grupo)
    } else if (rolFiltro) {
      lista = lista.filter(u => u.rol === rolFiltro)
    }
    if (query) {
      const q = query.toLowerCase()
      lista = lista.filter(u =>
        u.nombre.toLowerCase().includes(q) ||
        u.apellido.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.colegio?.nombre.toLowerCase().includes(q)
      )
    }
    return lista
  }, [usuarios, rolFiltro, query])

  // ── Handlers ─────────────────────────────────────────────────
  async function handleToggle(usuario: Usuario) {
    const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !usuario.activo }),
    })
    if (res.ok) {
      setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, activo: !u.activo } : u))
      setToast({ msg: usuario.activo ? 'Usuario desactivado' : 'Usuario activado', type: 'success' })
    } else {
      setToast({ msg: 'Error al actualizar', type: 'error' })
    }
    setConfirmando(null)
  }

  async function handleDelete(usuario: Usuario) {
    const res = await fetch(`/api/admin/usuarios/${usuario.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setUsuarios(prev => prev.filter(u => u.id !== usuario.id))
      setToast({ msg: 'Usuario eliminado', type: 'success' })
    } else if (res.status === 409) {
      setDeleteError({ msg: data.error, usuario })
    } else {
      setToast({ msg: data.error ?? 'Error al eliminar', type: 'error' })
    }
    setConfirmando(null)
  }

  async function handleDeactivateFromError() {
    if (!deleteError) return
    await handleToggle({ ...deleteError.usuario, activo: true })
    setDeleteError(null)
  }

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Confirm dialog */}
      {confirmando && (
        <Confirm
          open
          title={confirmando.tipo === 'delete' ? 'Eliminar usuario' : confirmando.usuario.activo ? 'Desactivar' : 'Activar'}
          message={confirmando.tipo === 'delete'
            ? `¿Eliminar a ${nombreCompleto(confirmando.usuario)}? Esta acción no se puede deshacer.`
            : `¿${confirmando.usuario.activo ? 'Desactivar' : 'Activar'} a ${nombreCompleto(confirmando.usuario)}?`
          }
          confirmLabel={confirmando.tipo === 'delete' ? 'Eliminar' : confirmando.usuario.activo ? 'Desactivar' : 'Activar'}
          danger={confirmando.tipo === 'delete' || confirmando.usuario.activo}
          onConfirm={() => confirmando.tipo === 'delete' ? handleDelete(confirmando.usuario) : handleToggle(confirmando.usuario)}
          onCancel={() => setConfirmando(null)}
        />
      )}

      {/* Delete error modal (related data) */}
      {deleteError && (
        <Modal open onClose={() => setDeleteError(null)} title="No se puede eliminar" size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              {deleteError.msg}
            </div>
            <p className="text-sm text-slate-600">Puedes desactivar el usuario para que no pueda iniciar sesión.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteError(null)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={handleDeactivateFromError} className="btn-danger flex-1">Desactivar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editando && (
        <EditModal
          usuario={editando}
          colegios={colegios}
          libros={libros}
          onClose={() => setEditando(null)}
          onSaved={(updated) => {
            setUsuarios(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
            setEditando(null)
            setToast({ msg: 'Usuario actualizado', type: 'success' })
          }}
        />
      )}

      {/* Acceso / QR modal (alumnos only) */}
      {accesoAlumno && (
        <AccesoModal
          usuario={accesoAlumno}
          onClose={() => setAccesoAlumno(null)}
        />
      )}

      {/* Create modal */}
      {creando && (
        <CrearModal
          colegios={colegios}
          onClose={() => setCreando(false)}
          onCreated={(newUser) => {
            setCreando(false)
            setUsuarios(prev => [...prev, newUser].sort((a, b) => a.nombre.localeCompare(b.nombre)))
            setToast({ msg: 'Usuario creado correctamente', type: 'success' })
          }}
        />
      )}

      {/* Controls */}
      <div className="space-y-4">
        {/* Role filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {ROLES.map(r => (
            <button
              key={r.value}
              onClick={() => setRolFiltro(r.value)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                r.value === 'sin_grupo'
                  ? rolFiltro === 'sin_grupo'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : rolFiltro === r.value
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r.label}
              {r.value === 'sin_grupo' && sinGrupoCount > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${rolFiltro === 'sin_grupo' ? 'bg-amber-400 text-white' : 'bg-amber-200 text-amber-800'}`}>
                  {sinGrupoCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search + create */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Buscar por nombre, correo, usuario o colegio..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setCreando(true)} className="btn-primary py-2 px-4 whitespace-nowrap">
            <UserPlus className="w-4 h-4" /> Nuevo
          </button>
        </div>

        <p className="text-xs text-slate-400">{filtrados.length} usuario{filtrados.length !== 1 ? 's' : ''}</p>

        {filtrados.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-slate-400">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map(u => (
              <div key={u.id} className={`card p-4 flex items-center gap-4 ${!u.activo ? 'opacity-60' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                  {u.nombre?.[0]}{u.apellido?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{nombreCompleto(u)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500 truncate">{u.colegio?.nombre ?? 'Sin colegio'}</span>
                  </div>
                  {u.rol === 'alumno' && (
                    u.grupo_alumnos?.[0]?.grupo
                      ? <p className="text-xs text-brand-600 font-medium truncate">Grupo: {u.grupo_alumnos[0].grupo.nombre}</p>
                      : <p className="text-xs text-amber-600 font-medium">Sin grupo</p>
                  )}
                  {u.email && <p className="text-xs text-slate-400 truncate">{u.email}</p>}
                  {u.username && <p className="text-xs text-slate-400 font-mono">@{u.username}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`badge text-xs ${colorRolBadge(u.rol)}`}>{labelRol(u.rol)}</span>
                  <span className={`badge text-xs ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  {u.rol === 'alumno' && u.username && (
                    <button
                      onClick={() => setAccesoAlumno(u)}
                      className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors"
                      title="QR / Contraseña"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setEditando(u)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmando({ tipo: 'toggle', usuario: u })}
                    className={`p-1.5 rounded-lg transition-colors ${u.activo ? 'hover:bg-red-50 text-slate-400 hover:text-red-600' : 'hover:bg-green-50 text-slate-400 hover:text-green-600'}`}
                    title={u.activo ? 'Desactivar' : 'Activar'}
                  >
                    {u.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setConfirmando({ tipo: 'delete', usuario: u })}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ── Acceso / QR Modal ─────────────────────────────────────────
function AccesoModal({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [password, setPassword] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)

  const colegioCodigo = usuario.colegio?.codigo ?? ''
  const loginUrl = colegioCodigo && usuario.username
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${colegioCodigo}/login?u=${usuario.username}`
    : ''

  useEffect(() => {
    if (!loginUrl) return
    QRCode.toDataURL(loginUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl)
  }, [loginUrl])

  async function handleReset() {
    setResetting(true)
    const res = await fetch(`/api/admin/usuarios/${usuario.id}/reset-password`, { method: 'POST' })
    const data = await res.json()
    setResetting(false)
    if (data.password) setPassword(data.password)
  }

  function handleCopy() {
    const lines = [
      `Alumno: ${usuario.nombre} ${usuario.apellido}`,
      `Usuario: ${usuario.username}`,
      password ? `Contraseña: ${password}` : '',
      `Acceso: ${loginUrl}`,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open onClose={onClose} title="Acceso del alumno" size="sm">
      <div className="space-y-4">
        {/* Name */}
        <p className="text-center font-semibold text-slate-800">{usuario.nombre} {usuario.apellido}</p>

        {/* QR */}
        <div className="flex justify-center">
          {qrDataUrl ? (
            <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl inline-block">
              <img src={qrDataUrl} alt="QR de acceso" className="w-48 h-48" />
            </div>
          ) : (
            <div className="w-48 h-48 bg-slate-100 rounded-2xl animate-pulse" />
          )}
        </div>

        {/* Credentials */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Usuario</span>
            <span className="font-mono font-bold text-slate-800">{usuario.username}</span>
          </div>
          {password ? (
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-slate-400 text-xs">Contraseña</span>
              <span className="font-mono font-bold text-brand-700 text-lg tracking-widest">{password}</span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 border-t border-slate-200 pt-2">
              La contraseña no se puede ver. Restablece para asignar una nueva.
            </p>
          )}
        </div>

        {/* Reset password button */}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Restableciendo...' : password ? 'Generar nueva contraseña' : 'Restablecer contraseña'}
        </button>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar datos'}
          </button>
          <button onClick={onClose} className="flex-1 btn-primary py-2 text-sm">Listo</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Edit Modal ────────────────────────────────────────────────
function EditModal({
  usuario,
  colegios,
  libros,
  onClose,
  onSaved,
}: {
  usuario: Usuario
  colegios: Colegio[]
  libros: Libro[]
  onClose: () => void
  onSaved: (u: Partial<Usuario> & { id: string }) => void
}) {
  const grupoActualId = usuario.grupo_alumnos?.[0]?.grupo_id ?? ''

  const [form, setForm] = useState({
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email ?? '',
    colegio_id: '',
    activo: usuario.activo,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Group assignment state for catequistas
  const [grupos, setGrupos] = useState<{ id: string; nombre: string; catequista?: { id: string } | null }[]>([])
  const [gruposAsignados, setGruposAsignados] = useState<string[]>([])
  const [savingGrupo, setSavingGrupo] = useState<string | null>(null)

  // Group assignment state for alumnos
  const [gruposDelColegio, setGruposDelColegio] = useState<{ id: string; nombre: string }[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(grupoActualId)
  const [librosDelGrupo, setLibrosDelGrupo] = useState<string[]>([])

  useEffect(() => {
    if (usuario.rol !== 'catequista' || !usuario.colegio_id) return
    fetch(`/api/admin/grupos?colegio_id=${usuario.colegio_id}`)
      .then(r => r.json())
      .then(data => {
        const lista = data.grupos ?? []
        setGrupos(lista)
        setGruposAsignados(lista.filter((g: any) => g.catequista?.id === usuario.id).map((g: any) => g.id))
      })
  }, [usuario.id, usuario.rol, usuario.colegio_id])

  useEffect(() => {
    if (usuario.rol !== 'alumno' || !usuario.colegio_id) return
    fetch(`/api/admin/colegios/${usuario.colegio_id}/grupos`)
      .then(r => r.json())
      .then(data => setGruposDelColegio(data.grupos ?? []))
  }, [usuario.id, usuario.rol, usuario.colegio_id])

  useEffect(() => {
    if (!grupoSeleccionado) { setLibrosDelGrupo([]); return }
    fetch(`/api/admin/libro-grupos?grupo_id=${grupoSeleccionado}`)
      .then(r => r.json())
      .then(data => setLibrosDelGrupo(data.libros ?? []))
  }, [grupoSeleccionado])

  async function handleToggleGrupo(grupoId: string, asignar: boolean) {
    setSavingGrupo(grupoId)
    const res = await fetch(`/api/admin/grupos/${grupoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catequista_id: asignar ? usuario.id : null }),
    })
    setSavingGrupo(null)
    if (res.ok) {
      setGruposAsignados(prev => asignar ? [...prev, grupoId] : prev.filter(id => id !== grupoId))
    }
  }

  async function handleSave() {
    if (!form.nombre || !form.apellido) { setError('Nombre y apellido son requeridos'); return }
    setSaving(true); setError('')
    const body: Record<string, unknown> = {
      nombre: form.nombre,
      apellido: form.apellido,
      activo: form.activo,
    }
    if (usuario.rol !== 'alumno' && form.email) body.email = form.email
    if (form.colegio_id) body.colegio_id = form.colegio_id

    const res = await fetch(`/api/admin/usuarios/${usuario.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.error) { setSaving(false); setError(data.error); return }

    // Handle group change for alumnos
    if (usuario.rol === 'alumno' && grupoSeleccionado !== grupoActualId) {
      if (grupoSeleccionado) {
        await fetch(`/api/admin/grupos/${grupoSeleccionado}/alumnos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alumnoId: usuario.id }),
        })
      } else if (grupoActualId) {
        await fetch(`/api/admin/grupos/${grupoActualId}/alumnos`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alumnoId: usuario.id }),
        })
      }
    }

    setSaving(false)
    const updatedUser: any = { id: usuario.id, ...body }
    if (usuario.rol === 'alumno' && grupoSeleccionado !== grupoActualId) {
      const newGrupo = gruposDelColegio.find(g => g.id === grupoSeleccionado)
      updatedUser.grupo_alumnos = grupoSeleccionado
        ? [{ grupo_id: grupoSeleccionado, grupo: newGrupo ? { id: newGrupo.id, nombre: newGrupo.nombre } : null }]
        : []
    }
    onSaved(updatedUser)
  }

  return (
    <Modal open onClose={onClose} title="Editar usuario">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Nombre</label>
            <input className="input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Apellido</label>
            <input className="input" value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} />
          </div>
        </div>

        {usuario.rol !== 'alumno' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Correo</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Colegio</label>
          <select className="input" value={form.colegio_id} onChange={e => setForm(p => ({ ...p, colegio_id: e.target.value }))}>
            <option value="">— Mantener actual ({usuario.colegio?.nombre ?? 'N/A'}) —</option>
            {colegios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        {/* Group assignment section for alumnos */}
        {usuario.rol === 'alumno' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Grupo</label>
            {gruposDelColegio.length === 0 ? (
              <p className="text-sm text-slate-400 px-3 py-2 bg-slate-50 rounded-xl">Sin grupos disponibles en este colegio</p>
            ) : (
              <select
                className="input"
                value={grupoSeleccionado}
                onChange={e => setGrupoSeleccionado(e.target.value)}
              >
                <option value="">Sin grupo</option>
                {gruposDelColegio.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            )}
            {librosDelGrupo.length > 0 && (
              <div className="px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl">
                <p className="text-xs text-purple-600 font-medium mb-1">Libros de este grupo:</p>
                <div className="space-y-0.5">
                  {librosDelGrupo.map(libroId => {
                    const libro = libros.find(l => l.id === libroId)
                    return libro ? (
                      <p key={libroId} className="text-xs text-slate-700">• {libro.titulo}</p>
                    ) : null
                  })}
                </div>
              </div>
            )}
            {grupoSeleccionado && librosDelGrupo.length === 0 && (
              <p className="text-xs text-amber-600 px-3 py-1.5 bg-amber-50 rounded-xl">Este grupo no tiene libros asignados</p>
            )}
          </div>
        )}

        {/* Group assignment section for catequistas */}
        {usuario.rol === 'catequista' && grupos.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Grupos asignados</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {grupos.map(grupo => {
                const asignado = gruposAsignados.includes(grupo.id)
                const cargando = savingGrupo === grupo.id
                return (
                  <div key={grupo.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-sm text-slate-700">{grupo.nombre}</span>
                    <button
                      type="button"
                      disabled={cargando}
                      onClick={() => handleToggleGrupo(grupo.id, !asignado)}
                      className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                        asignado
                          ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      {cargando ? '...' : asignado ? 'Asignado' : 'Asignar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Estado</label>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${form.activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
          >
            {form.activo ? 'Activo' : 'Inactivo'}
          </button>
        </div>

        {usuario.username && (
          <div className="px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-500">
            Usuario: <span className="font-mono font-semibold">{usuario.username}</span> (no editable)
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Create Modal ──────────────────────────────────────────────
function CrearModal({
  colegios,
  onClose,
  onCreated,
}: {
  colegios: Colegio[]
  onClose: () => void
  onCreated: (newUser: Usuario) => void
}) {
  const [rol, setRol] = useState<'admin_colegio' | 'catequista' | 'alumno'>('admin_colegio')
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', colegioId: '', grupoId: '' })
  const [grupos, setGrupos] = useState<{ id: string; nombre: string }[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ username?: string; password: string; email?: string; perfilId?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function loadGrupos(colegioId: string) {
    if (!colegioId) { setGrupos([]); return }
    setLoadingGrupos(true)
    const res = await fetch(`/api/admin/colegios/${colegioId}/grupos`)
    if (res.ok) {
      const data = await res.json()
      setGrupos(data.grupos ?? [])
    }
    setLoadingGrupos(false)
  }

  async function handleCreate() {
    if (!form.nombre || !form.apellido || !form.colegioId) {
      setError('Nombre, apellido y colegio son requeridos'); return
    }
    if (rol !== 'alumno' && !form.email) {
      setError('El correo es requerido'); return
    }
    setSaving(true); setError('')

    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, rol }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { setError(data.error); return }
    setResult({ username: data.username, password: data.password, email: form.email || undefined, perfilId: data.perfilId })
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    return (
      <Modal open onClose={onClose} title="Usuario creado">
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-green-100 flex items-center justify-center text-2xl">✓</div>
          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm">
            {result.username && (
              <p><span className="text-slate-400">Usuario:</span> <strong className="font-mono">{result.username}</strong></p>
            )}
            {result.email && (
              <p><span className="text-slate-400">Correo:</span> <strong>{result.email}</strong></p>
            )}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <div>
                <p className="text-slate-400 text-xs">Contraseña temporal</p>
                <p className="font-mono font-bold text-brand-700 text-lg">{result.password}</p>
              </div>
              <button
                onClick={() => handleCopy(`${result.username ? `Usuario: ${result.username}\n` : ''}${result.email ? `Correo: ${result.email}\n` : ''}Contraseña: ${result.password}`)}
                className="btn-secondary py-2 px-3"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              const colegio = colegios.find(c => c.id === form.colegioId)
              onCreated({
                id: result.perfilId ?? '',
                nombre: form.nombre,
                apellido: form.apellido,
                email: form.email || undefined,
                username: result.username,
                rol,
                activo: true,
                created_at: new Date().toISOString(),
                colegio_id: form.colegioId,
                colegio: colegio ? { nombre: colegio.nombre } : undefined,
                grupo_alumnos: [],
              })
            }}
            className="btn-primary w-full"
          >
            Listo
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Nuevo usuario">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        {/* Role tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
          {(['admin_colegio', 'catequista', 'alumno'] as const).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRol(r)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${rol === r ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
            >
              {r === 'admin_colegio' ? 'Admin' : r === 'catequista' ? 'Catequista' : 'Alumno'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Nombre *</label>
            <input className="input" placeholder="Ana" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Apellido *</label>
            <input className="input" placeholder="García" value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} />
          </div>
        </div>

        {(rol !== 'alumno') && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Correo *</label>
            <input className="input" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
        )}
        {rol === 'alumno' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Correo (opcional)</label>
            <input className="input" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Colegio *</label>
          <select
            className="input"
            value={form.colegioId}
            onChange={e => {
              setForm(p => ({ ...p, colegioId: e.target.value, grupoId: '' }))
              if (rol === 'alumno') loadGrupos(e.target.value)
            }}
          >
            <option value="">Seleccionar colegio...</option>
            {colegios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        {rol === 'alumno' && form.colegioId && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Grupo (opcional)</label>
            {loadingGrupos ? (
              <p className="text-sm text-slate-400">Cargando grupos...</p>
            ) : grupos.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">Este colegio no tiene grupos. Se puede asignar después.</p>
            ) : (
              <select className="input" value={form.grupoId} onChange={e => setForm(p => ({ ...p, grupoId: e.target.value }))}>
                <option value="">Sin grupo por ahora</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
