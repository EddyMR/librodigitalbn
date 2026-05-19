'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserX, UserCheck, Trash2, Pencil, QrCode, RefreshCw, Copy, Check } from 'lucide-react'
import { avatarUrl, nombreCompleto, labelRol, formatFecha } from '@/lib/utils'
import { Modal, Confirm, Toast, Badge, Avatar } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Perfil, Grupo } from '@/types'
import QRCode from 'qrcode'

type UsuarioConGrupos = Perfil & {
  grupo_alumnos?: { grupo: { id: string; nombre: string } }[]
  grupos_catequista?: { id: string; nombre: string }[]
}

interface Props {
  usuarios: UsuarioConGrupos[]
  grupos: (Grupo & { catequista_id?: string | null })[]
  codigoColegio: string
  rolAdmin: string
}

export default function UsuariosClient({ usuarios, grupos, codigoColegio, rolAdmin }: Props) {
  const [listaUsuarios, setListaUsuarios] = useState(usuarios)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [confirm, setConfirm] = useState<{ type: 'delete' | 'toggle'; usuario: Perfil } | null>(null)
  const [editando, setEditando] = useState<UsuarioConGrupos | null>(null)
  const [deleteError, setDeleteError] = useState<{ msg: string; usuario: Perfil } | null>(null)
  const [accesoAlumno, setAccesoAlumno] = useState<Perfil | null>(null)
  const router = useRouter()

  useEffect(() => {
    const onFocus = () => router.refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

  const filtered = useMemo(() => {
    if (!query) return listaUsuarios
    const q = query.toLowerCase()
    return listaUsuarios.filter(u =>
      u.nombre.toLowerCase().includes(q) ||
      u.apellido.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  }, [query, listaUsuarios])

  async function handleToggleActivo(usuario: Perfil) {
    const res = await fetch(`/api/colegio/usuarios/${usuario.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !usuario.activo }),
    })
    if (res.ok) {
      setToast({ msg: usuario.activo ? 'Usuario desactivado' : 'Usuario activado', type: 'success' })
      router.refresh()
    } else {
      setToast({ msg: 'Error al actualizar', type: 'error' })
    }
    setConfirm(null)
  }

  async function handleDelete(usuario: Perfil) {
    const res = await fetch(`/api/colegio/usuarios/${usuario.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      setToast({ msg: 'Usuario eliminado', type: 'success' })
      router.refresh()
    } else if (res.status === 409) {
      setDeleteError({ msg: data.error, usuario })
    } else {
      setToast({ msg: data.error ?? 'Error al eliminar', type: 'error' })
    }
    setConfirm(null)
  }

  async function handleDeactivateFromError() {
    if (!deleteError) return
    await handleToggleActivo({ ...deleteError.usuario, activo: true })
    setDeleteError(null)
  }

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Confirm dialog */}
      {confirm && (
        <Confirm
          open
          title={confirm.type === 'delete' ? 'Eliminar usuario' : confirm.usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
          message={confirm.type === 'delete'
            ? `¿Eliminar a ${nombreCompleto(confirm.usuario)}? Esta acción no se puede deshacer.`
            : `¿${confirm.usuario.activo ? 'Desactivar' : 'Activar'} a ${nombreCompleto(confirm.usuario)}?`
          }
          confirmLabel={confirm.type === 'delete' ? 'Eliminar' : confirm.usuario.activo ? 'Desactivar' : 'Activar'}
          danger={confirm.type === 'delete' || confirm.usuario.activo}
          onConfirm={() => confirm.type === 'delete' ? handleDelete(confirm.usuario) : handleToggleActivo(confirm.usuario)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Delete error modal */}
      {deleteError && (
        <Modal open onClose={() => setDeleteError(null)} title="No se puede eliminar" size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              {deleteError.msg}
            </div>
            <p className="text-sm text-slate-600">Puedes desactivar al usuario para que no pueda iniciar sesión.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteError(null)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={handleDeactivateFromError} className="btn-danger flex-1">Desactivar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* QR / Acceso modal */}
      {accesoAlumno && (
        <AccesoAlumnoModal
          usuario={accesoAlumno}
          codigoColegio={codigoColegio}
          onClose={() => setAccesoAlumno(null)}
        />
      )}

      {/* Edit modal */}
      {editando && (
        <EditarUsuarioModal
          usuario={editando}
          grupos={grupos}
          onClose={() => setEditando(null)}
          onSaved={(gruposActualizados) => {
            if (gruposActualizados !== undefined) {
              setListaUsuarios(prev => prev.map(u =>
                u.id === editando.id
                  ? { ...u, grupos_catequista: gruposActualizados }
                  : u
              ))
            }
            setEditando(null)
            setToast({ msg: 'Usuario actualizado', type: 'success' })
            router.refresh()
          }}
        />
      )}

      <div className="px-4 pt-4 space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por nombre o usuario..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <p className="text-xs text-slate-400">{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</p>

        {filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-slate-400">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(usuario => {
              const grupo = usuario.grupo_alumnos?.[0]?.grupo
              return (
                <div
                  key={usuario.id}
                  className={cn('card p-3 flex items-center gap-3', !usuario.activo && 'opacity-60')}
                >
                  <Avatar avatarId={usuario.avatar_id} nombre={usuario.nombre} apellido={usuario.apellido} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{nombreCompleto(usuario)}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {usuario.username ? `@${usuario.username}` : usuario.email}
                      {grupo ? ` · ${grupo.nombre}` : ''}
                    </p>
                    {/* Grupos del catequista */}
                    {usuario.rol === 'catequista' && (usuario as UsuarioConGrupos).grupos_catequista?.length ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(usuario as UsuarioConGrupos).grupos_catequista!.map(g => (
                          <span key={g.id} className="px-1.5 py-0.5 bg-brand-100 text-brand-700 text-xs rounded-full font-medium">
                            {g.nombre}
                          </span>
                        ))}
                      </div>
                    ) : usuario.rol === 'catequista' ? (
                      <p className="text-xs text-amber-500 mt-0.5">Sin grupo asignado</p>
                    ) : null}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant={usuario.rol === 'alumno' ? 'default' : usuario.rol === 'catequista' ? 'warning' : 'purple'}>
                        {labelRol(usuario.rol)}
                      </Badge>
                      {!usuario.activo && <Badge variant="danger">Inactivo</Badge>}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {usuario.rol === 'alumno' && usuario.username && (
                      <button
                        onClick={() => setAccesoAlumno(usuario)}
                        className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors"
                        title="QR / Contraseña"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditando(usuario)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirm({ type: 'toggle', usuario })}
                      className={cn('p-1.5 rounded-lg transition-colors', usuario.activo
                        ? 'hover:bg-red-50 text-slate-400 hover:text-red-600'
                        : 'hover:bg-green-50 text-slate-400 hover:text-green-600'
                      )}
                      title={usuario.activo ? 'Desactivar' : 'Activar'}
                    >
                      {usuario.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setConfirm({ type: 'delete', usuario })}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ── Acceso / QR Modal ─────────────────────────────────────────
function AccesoAlumnoModal({
  usuario,
  codigoColegio,
  onClose,
}: {
  usuario: Perfil
  codigoColegio: string
  onClose: () => void
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [password, setPassword] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)

  const loginUrl = usuario.username
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${codigoColegio}/login?u=${usuario.username}`
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
    const res = await fetch(`/api/colegio/usuarios/${usuario.id}/reset-password`, { method: 'POST' })
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
        <p className="text-center font-semibold text-slate-800">{usuario.nombre} {usuario.apellido}</p>

        <div className="flex justify-center">
          {qrDataUrl ? (
            <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl">
              <img src={qrDataUrl} alt="QR de acceso" className="w-48 h-48" />
            </div>
          ) : (
            <div className="w-48 h-48 bg-slate-100 rounded-2xl animate-pulse" />
          )}
        </div>

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

        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          {resetting ? 'Restableciendo...' : password ? 'Generar nueva contraseña' : 'Restablecer contraseña'}
        </button>

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

// ── Editar usuario modal ───────────────────────────────────────
function EditarUsuarioModal({
  usuario,
  grupos,
  onClose,
  onSaved,
}: {
  usuario: UsuarioConGrupos
  grupos: (Grupo & { catequista_id?: string | null })[]
  onClose: () => void
  onSaved: (gruposActualizados?: { id: string; nombre: string }[]) => void
}) {
  const grupoActualId = usuario.grupo_alumnos?.[0]?.grupo?.id ?? ''
  const grupoActualNombre = usuario.grupo_alumnos?.[0]?.grupo?.nombre ?? null
  const [form, setForm] = useState({
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email ?? '',
    activo: usuario.activo,
  })
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(grupoActualId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Group assignment state for catequistas
  const [gruposAsignados, setGruposAsignados] = useState<string[]>(() =>
    grupos.filter(g => g.catequista_id === usuario.id).map(g => g.id)
  )
  const [savingGrupo, setSavingGrupo] = useState<string | null>(null)

  async function handleToggleGrupo(grupoId: string, asignar: boolean) {
    setSavingGrupo(grupoId)
    const res = await fetch(`/api/colegio/grupos/${grupoId}`, {
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

    const res = await fetch(`/api/colegio/usuarios/${usuario.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.error) { setSaving(false); setError(data.error); return }

    // Change group if alumno and group changed
    if (usuario.rol === 'alumno' && grupoSeleccionado && grupoSeleccionado !== grupoActualId) {
      const resGrupo = await fetch(`/api/colegio/grupos/${grupoSeleccionado}/alumnos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumnoId: usuario.id }),
      })
      const dataGrupo = await resGrupo.json()
      if (!resGrupo.ok) { setSaving(false); setError(dataGrupo.error ?? 'Error al cambiar grupo'); return }
    }

    setSaving(false)

    const gruposActualizados = usuario.rol === 'catequista'
      ? grupos.filter(g => gruposAsignados.includes(g.id)).map(g => ({ id: g.id, nombre: g.nombre }))
      : undefined

    onSaved(gruposActualizados)
  }

  return (
    <Modal open onClose={onClose} title="Editar usuario">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
          <Avatar avatarId={usuario.avatar_id} nombre={usuario.nombre} apellido={usuario.apellido} size={48} />
          <div>
            <Badge variant={usuario.rol === 'alumno' ? 'default' : usuario.rol === 'catequista' ? 'warning' : 'purple'}>
              {labelRol(usuario.rol)}
            </Badge>
            {grupoActualNombre && <p className="text-xs text-slate-400 mt-0.5">Grupo: {grupoActualNombre}</p>}
          </div>
        </div>

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

        {usuario.username && (
          <div className="px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-500">
            Usuario: <span className="font-mono font-semibold">{usuario.username}</span> (no editable)
          </div>
        )}

        {/* Group selector for alumnos */}
        {usuario.rol === 'alumno' && grupos.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Grupo</label>
            <select
              className="input"
              value={grupoSeleccionado}
              onChange={e => setGrupoSeleccionado(e.target.value)}
            >
              <option value="">Sin grupo</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
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
