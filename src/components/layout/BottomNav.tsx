'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, User, Users, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RolUsuario } from '@/types'

interface Props {
  codigo: string
  rol: RolUsuario
}

const navByRol: Record<string, { href: string; label: string; icon: React.ElementType }[]> = {
  alumno: [
    { href: '/inicio', label: 'Inicio', icon: Home },
    { href: '/perfil', label: 'Perfil', icon: User },
  ],
  catequista: [
    { href: '/grupo', label: 'Mi grupo', icon: Users },
    { href: '/perfil', label: 'Perfil', icon: User },
  ],
  admin_colegio: [
    { href: '/dashboard', label: 'Inicio', icon: Home },
    { href: '/usuarios', label: 'Usuarios', icon: Users },
    { href: '/grupos', label: 'Grupos', icon: BarChart2 },
    { href: '/perfil', label: 'Perfil', icon: User },
  ],
}

export default function BottomNav({ codigo, rol }: Props) {
  const pathname = usePathname()

  const navItems = navByRol[rol] ?? navByRol.alumno

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {navItems.map(({ href, label, icon: Icon }) => {
        const fullHref = `/${codigo}${href}`
        const isActive = pathname.startsWith(fullHref) || (href === '/inicio' && pathname === `/${codigo}`) || (href === '/dashboard' && pathname === `/${codigo}`)

        return (
          <Link key={href} href={fullHref} className={cn('bottom-nav-item', isActive && 'active')}>
            <Icon className={cn('w-6 h-6', isActive ? 'text-brand-600' : 'text-slate-400')} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="text-[10px]">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
