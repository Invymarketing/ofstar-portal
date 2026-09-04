'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Bot, Sparkles, DollarSign, MessageSquare, BarChart3, Users, Calendar,
  Bell, FolderOpen, UserPlus, Megaphone, PhoneCall, LayoutDashboard, UserCircle2,
  ChevronDown, X,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { getAccessibleModules } from '@/lib/modules'

const ICON_MAP: Record<string, React.ElementType> = {
  Bot, Sparkles, DollarSign, MessageSquare, BarChart3, Users, Calendar,
  Bell, FolderOpen, UserPlus, Megaphone, PhoneCall,
}

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
  const visibles = getAccessibleModules(role).filter((m) => m.isBuilt && m.area !== 'topbar')

  const [abiertas, setAbiertas] = useState<Record<string, boolean>>(
    () => Object.fromEntries(AREAS.map((a) => [a.key, true]))
  )
  const toggle = (k: string) => setAbiertas((p) => ({ ...p, [k]: !p[k] }))

  const linkClass = (active: boolean) => `
    flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all
    ${active
      ? 'bg-gold/10 text-gold border border-gold/20'
      : 'text-muted hover:text-foreground hover:bg-[var(--hover)]'}
  `

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={onClose} />}

      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64 flex flex-col
          bg-surface border-r border-border
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Marca */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            <Image src="/logo.png" alt="Skeilab" width={40} height={40} className="rounded-lg flex-shrink-0" />
            <p className="text-xl font-extrabold tracking-tight text-foreground leading-tight">Skei<span className="text-gold">lab</span></p>
          </Link>
          <button onClick={onClose} className="lg:hidden text-muted hover:text-foreground p-1 rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <Link href="/" onClick={onClose} className={linkClass(pathname === '/')}>
            <LayoutDashboard size={16} className="flex-shrink-0" /> <span>Inicio</span>
          </Link>

          {(role === 'admin' || role === 'manager') && (
            <Link href="/modelos" onClick={onClose} className={linkClass(pathname.startsWith('/modelos'))}>
              <UserCircle2 size={16} className="flex-shrink-0" /> <span>Modelos</span>
            </Link>
          )}

          {(role === 'admin' || role === 'manager' || role === 'team_leader') && (
            <Link href="/usuarios" onClick={onClose} className={linkClass(pathname.startsWith('/usuarios'))}>
              <UserPlus size={16} className="flex-shrink-0" /> <span>{role === 'team_leader' ? 'Chatters' : 'Empleados'}</span>
            </Link>
          )}

          {AREAS.map((area) => {
            const mods = visibles.filter((m) => m.area === area.key)
            if (mods.length === 0) return null
            const open = abiertas[area.key]
            return (
              <div key={area.key} className="mt-3">
                <button onClick={() => toggle(area.key)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[var(--hover)] transition-colors">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">{area.label}</span>
                  <ChevronDown size={14} className={`text-muted transition-transform ${open ? '' : '-rotate-90'}`} />
                </button>
                {open && (
                  <div className="mt-0.5">
                    {mods.map((mod) => {
                      const Icon = ICON_MAP[mod.icon]
                      const isActive = pathname.startsWith(`/${mod.slug}`)
                      return (
                        <Link key={mod.id} href={`/${mod.slug}`} onClick={onClose}
                          className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all
                            ${isActive
                              ? 'bg-gold/10 text-gold border border-gold/20 font-medium'
                              : 'text-muted hover:text-foreground hover:bg-[var(--hover)] font-normal'}`}>
                          {Icon && <Icon size={16} className="flex-shrink-0" />}
                          <span className="flex-1 truncate">{mod.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="px-5 py-3 border-t border-border">
          <p className="text-xs text-muted/60">v1.0.0 · INVY Marketing FZE LLC</p>
        </div>
      </aside>
    </>
  )
}
