'use client'

import { logout } from '@/lib/auth'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
      >
        <LogOut className="w-5 h-5" />
        Cerrar sesión
      </button>
    </form>
  )
}
