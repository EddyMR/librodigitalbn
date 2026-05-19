'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Modal ─────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={cn(
          'relative bg-white rounded-3xl shadow-xl w-full animate-slide-up max-h-[90dvh] overflow-y-auto',
          size === 'sm' && 'max-w-xs',
          size === 'md' && 'max-w-md',
          size === 'lg' && 'max-w-lg',
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="btn-icon btn-ghost -mr-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────
interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={cn(
      'fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm px-4 py-3 rounded-2xl shadow-lg',
      'animate-slide-up flex items-center gap-3',
      type === 'success' && 'bg-green-600 text-white',
      type === 'error' && 'bg-red-600 text-white',
      type === 'info' && 'bg-slate-800 text-white',
    )}>
      <span className="text-xl">{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Confirm dialog ────────────────────────────────────────────
interface ConfirmProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function Confirm({ open, title, message, confirmLabel = 'Confirmar', danger, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancelar</button>
          <button
            onClick={onConfirm}
            className={cn('flex-1', danger ? 'btn-danger' : 'btn-primary')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Empty state ───────────────────────────────────────────────
interface EmptyProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function Empty({ icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="font-semibold text-slate-600">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Loading spinner ───────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('w-6 h-6 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin', className)} />
  )
}

// ── Badge ─────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple'
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={cn('badge', {
      'bg-slate-100 text-slate-600': variant === 'default',
      'bg-green-100 text-green-700': variant === 'success',
      'bg-amber-100 text-amber-700': variant === 'warning',
      'bg-red-100 text-red-700': variant === 'danger',
      'bg-purple-100 text-purple-700': variant === 'purple',
    })}>
      {children}
    </span>
  )
}

// ── Avatar ─────────────────────────────────────────────────────
import Image from 'next/image'
import { avatarUrl, iniciales } from '@/lib/utils'

interface AvatarProps {
  avatarId?: number
  nombre: string
  apellido: string
  size?: number
}

export function Avatar({ avatarId, nombre, apellido, size = 40 }: AvatarProps) {
  if (avatarId) {
    return (
      <Image
        src={avatarUrl(avatarId)}
        alt={`${nombre} ${apellido}`}
        width={size}
        height={size}
        className="rounded-xl object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div
      className="rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0 font-bold text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {iniciales({ nombre, apellido })}
    </div>
  )
}
