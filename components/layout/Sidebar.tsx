'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Bot, Sparkles, DollarSign, MessageSquare, BarChart3, Users, Calendar, Bell,
  FolderOpen, UserPlus, Megaphone, LayoutDashboard, UserCircle2, X,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { getAccessibleModules } from '@/lib/modules'

const ICON_MAP: Record<string, React.ElementType> = {
  Bot, Sparkles, DollarSign, MessageSquare, BarChart3, Users, Calendar, Bell, FolderOpen, UserPlus, Megaphone,
}

// Orden y nombre de las áreas
const AREAS: { key: string; label: string }[] = [
  { key: 'comercial', label: 'Comercial' },
  { key: 'chatting', label: 'Equipo de Chatting' },
  { key: 'contenido', label: 'Contenido' },
  { key: 'modelos', label: 'Modelos' },
  { key: 'admin', label: 'Administración' },
]

// Enlaces especiales (no son módulos) por área
const ESPECIALES: Record<string, { href: string; label: string; icon: React.ElementType; roles: UserRole[] }[]> = {
  modelos: [{ href: '/modelos', label: 'Modelos', icon: UserCircle2, roles: ['admin', 'manager'] }],
  admin: [{ href: '/usuarios', label: 'Empleados', icon: Users, roles: ['admin', 'manager'] }],
}

interface SidebarProps { role: UserRole; isOpen: boolean; onClose: () => void }

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const accesibles = getAccessibleModules(role).filter((m) => m.isBuilt && m.area !== 'topbar')

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all ${
      active ? 'bg-gold/10 text-gold border border-gold/20 font-medium' : 'text-zinc-300 hover:text-white hover:bg-white/5 font-normal'
    }`

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 left-0 z-30 h-full w-64 flex flex-col bg-surface border-r border-border
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            <Image src="/logo.png" alt="OF Star Management" width={36} height={36} className="rounded-lg flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">OF Star</p>
              <p className="text-xs text-muted leading-tight">Management</p>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden text-muted hover:text-foreground p-1 rounded transition-colors"><X size={18} /></button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {/* Inicio */}
          <Link href="/" onClick={onClose} className={linkCls(pathname === '/')}>
            <LayoutDashboard size={16} className="flex-shrink-0" />
            <span>Inicio</span>
          </Link>

          {/* Áreas */}
          {AREAS.map((area) => {
            const mods = accesibles.filter((m) => m.area === area.key)
            const especiales = (ESPECIALES[area.key] ?? []).filter((e) => role === 'admin' || e.roles.includes(role))
            if (mods.length === 0 && especiales.length === 0) return null
            return (
              <div key={area.key}>
                <div className="mt-4 mb-1.5 px-3">
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">{area.label}</p>
                </div>
                {especiales.map((e) => {
                  const Icon = e.icon
                  const active = pathname.startsWith(e.href)
                  return (
                    <Link key={e.href} href={e.href} onClick={onClose} className={linkCls(active)}>
                      <Icon size={16} className="flex-shrink-0" />
                      <span className="flex-1 truncate">{e.label}</span>
                    </Link>
                  )
                })}
                {mods.map((mod) => {
                  const Icon = ICON_MAP[mod.icon]
                  const active = pathname.startsWith(`/${mod.slug}`)
                  return (
                    <Link key={mod.id} href={`/${mod.slug}`} onClick={onClose} className={linkCls(active)}>
                      {Icon && <Icon size={16} className="flex-shrink-0" />}
                      <span className="flex-1 truncate">{mod.name}</span>
                    </Link>
                  )
                })}
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
