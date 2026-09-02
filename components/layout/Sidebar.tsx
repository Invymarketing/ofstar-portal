'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Bot,
  Sparkles,
  DollarSign,
  MessageSquare,
  BarChart3,
  Users,
  Calendar,
  Bell,
  FolderOpen,
  UserPlus,
  Megaphone,
  LayoutDashboard,
  UserCircle2,
  X,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { getAccessibleModules } from '@/lib/modules'

const ICON_MAP: Record<string, React.ElementType> = {
  Bot,
  Sparkles,
  DollarSign,
  MessageSquare,
  BarChart3,
  Users,
  Calendar,
  Bell,
  FolderOpen,
  UserPlus,
  Megaphone,
}

// Orden y etiqueta de las áreas en el menú. (topbar no se muestra en el sidebar)
const AREAS: { key: string; label: string }[] = [
  { key: 'comercial', label: 'Comercial' },
  { key: 'chatting', label: 'Chatting' },
  { key: 'contenido', label: 'Contenido' },
  { key: 'modelos', label: 'Modelos' },
  { key: 'admin', label: 'Administración' },
]

interface SidebarProps {
  role: UserRole
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  // Solo módulos construidos y que no sean de la barra superior (topbar)
  const visibles = getAccessibleModules(role).filter((m) => m.isBuilt && m.area !== 'topbar')

  const linkClass = (active: boolean) => `
    flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all
    ${active
      ? 'bg-gold/10 text-gold border border-gold/20'
      : 'text-zinc-300 hover:text-white hover:bg-surface'}
  `

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64 flex flex-col
          bg-surface border-r border-border
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            <Image src="/logo.png" alt="OF Star Management" width={36} height={36} className="rounded-lg flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">OF Star</p>
              <p className="text-xs text-muted leading-tight">Management</p>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-muted hover:text-foreground p-1 rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {/* Inicio */}
          <Link href="/" onClick={onClose} className={linkClass(pathname === '/')}>
            <LayoutDashboard size={16} className="flex-shrink-0" />
            <span>Inicio</span>
          </Link>

          {/* Modelos — solo admin y manager */}
          {(role === 'admin' || role === 'manager') && (
            <Link href="/modelos" onClick={onClose} className={linkClass(pathname.startsWith('/modelos'))}>
              <UserCircle2 size={16} className="flex-shrink-0" />
              <span>Modelos</span>
            </Link>
          )}

          {/* Empleados — admin, manager y team leader (el TL solo gestiona chatters) */}
          {(role === 'admin' || role === 'manager' || role === 'team_leader') && (
            <Link href="/usuarios" onClick={onClose} className={linkClass(pathname.startsWith('/usuarios'))}>
              <UserPlus size={16} className="flex-shrink-0" />
              <span>{role === 'team_leader' ? 'Chatters' : 'Empleados'}</span>
            </Link>
          )}

          {/* Módulos agrupados por área */}
          {AREAS.map((area) => {
            const mods = visibles.filter((m) => m.area === area.key)
            if (mods.length === 0) return null
            return (
              <div key={area.key} className="mt-4">
                <div className="mb-1.5 px-3">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">{area.label}</p>
                </div>
                {mods.map((mod) => {
                  const Icon = ICON_MAP[mod.icon]
                  const isActive = pathname.startsWith(`/${mod.slug}`)
                  return (
                    <Link
                      key={mod.id}
                      href={`/${mod.slug}`}
                      onClick={onClose}
                      className={`
                        group flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all
                        ${isActive
                          ? 'bg-gold/10 text-gold border border-gold/20 font-medium'
                          : 'text-zinc-300 hover:text-white hover:bg-white/5 font-normal'}
                      `}
                    >
                      {Icon && <Icon size={16} className="flex-shrink-0" />}
                      <span className="flex-1 truncate">{mod.name}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Bottom version */}
        <div className="px-5 py-3 border-t border-border">
          <p className="text-xs text-muted/60">v1.0.0 · INVY Marketing FZE LLC</p>
        </div>
      </aside>
    </>
  )
}
