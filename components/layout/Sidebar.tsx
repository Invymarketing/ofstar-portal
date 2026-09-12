'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Bot, Sparkles, DollarSign, MessageSquare, BarChart3, Users, Calendar,
  Bell, FolderOpen, UserPlus, Megaphone, PhoneCall, LayoutDashboard, UserCircle2,
  X, CheckSquare, Languages, Wrench, Search, BookUser, Wallet, Settings,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { getAccessibleModules } from '@/lib/modules'

// Logo de Instagram (lucide-react ya no trae el ícono de marca).
function InstagramIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

// Icono de tacón en línea (mismo estilo de trazo que el resto del menú).
function TaconIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-9.18 -28.14 205.05 205.05" fill="none" stroke="currentColor" strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M14.17 146.25 C13.68 145.29 12.99 133.93 12.65 121.00 C11.94 94.57 10.77 80.02 7.94 62.50 C4.96 44.08 5.73 29.94 10.23 20.28 C14.49 11.14 27.08 -0.01 33.13 0.01 C36.48 0.02 36.56 0.13 45.41 17.26 C59.59 44.72 80.52 82.82 87.84 94.50 C99.48 113.07 103.07 117.00 108.40 117.00 C112.29 117.00 114.71 114.64 118.41 107.25 C119.85 104.36 121.64 102.00 122.38 102.00 C123.12 102.00 129.46 104.71 136.47 108.02 C143.48 111.34 155.35 116.12 162.85 118.65 C179.77 124.36 179.69 124.32 180.51 128.06 C181.73 133.59 179.53 136.75 173.65 137.95 C141.65 144.48 96.34 147.93 87.42 144.52 C78.61 141.16 68.02 128.08 61.08 112.00 C50.23 86.87 40.95 73.00 35.00 73.00 C30.78 73.00 26.46 82.60 25.14 94.89 C24.73 98.78 24.79 111.68 25.27 123.55 C25.76 135.42 25.91 145.78 25.61 146.57 C24.76 148.79 15.34 148.52 14.17 146.25 Z" />
    </svg>
  )
}

const ICON_MAP: Record<string, React.ElementType> = {
  Bot, Sparkles, DollarSign, MessageSquare, BarChart3, Users, Calendar,
  Bell, FolderOpen, UserPlus, Megaphone, PhoneCall, CheckSquare, Languages,
  Wrench, Search, BookUser, Wallet, Instagram: InstagramIcon,
}

// Cada categoría tiene su propio ícono para el rail colapsado.
const AREAS: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'marketing', label: 'Marketing', icon: InstagramIcon },
  { key: 'chatting', label: 'Chatting', icon: MessageSquare },
  { key: 'herramientas', label: 'Herramientas', icon: Wrench },
  { key: 'modelos', label: 'Modelos', icon: TaconIcon },
  { key: 'admin', label: 'Administración', icon: Bell },
  { key: 'finanzas', label: 'Finanzas', icon: Wallet },
]

interface SidebarProps {
  role: UserRole
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const visibles = getAccessibleModules(role).filter((m) => m.isBuilt && m.area !== 'topbar')

  // Flyout: qué categoría está abierta y a qué altura mostrarla
  const [flyout, setFlyout] = useState<{ key: string; top: number } | null>(null)
  const railRef = useRef<HTMLElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)

  // Cerrar el flyout al hacer clic fuera o al cambiar de ruta
  useEffect(() => { setFlyout(null) }, [pathname])
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      const dentroRail = railRef.current?.contains(t)
      const dentroFlyout = flyoutRef.current?.contains(t)
      if (!dentroRail && !dentroFlyout) setFlyout(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const areasConMods = AREAS
    .map((a) => ({ ...a, mods: visibles.filter((m) => m.area === a.key) }))
    .filter((a) => a.mods.length > 0)

  const areaActiva = (key: string) =>
    visibles.some((m) => m.area === key && (pathname === `/${m.slug}` || pathname.startsWith(`/${m.slug}/`)))

  function toggleFlyout(key: string, e: React.MouseEvent) {
    const btn = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setFlyout((prev) => (prev?.key === key ? null : { key, top: btn.top }))
  }

  // Botón redondo del rail (íconos)
  const railBtn = (active: boolean) => `
    flex items-center justify-center w-11 h-11 rounded-xl transition-all
    ${active
      ? 'bg-gold/15 text-gold border border-gold/30'
      : 'text-muted hover:text-foreground hover:bg-[var(--hover)] border border-transparent'}
  `

  const abierta = flyout ? areasConMods.find((a) => a.key === flyout.key) : null

  const verModelos = ['admin', 'manager', 'team_leader', 'chatter', 'creativo', 'marketing_manager', 'content_manager', 'director_creativo'].includes(role)

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={onClose} />}

      <aside
        ref={railRef}
        className={`
          fixed top-0 left-0 z-30 h-full w-[72px] flex flex-col items-center
          bg-surface border-r border-border
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="w-full flex items-center justify-center py-4 border-b border-border">
          <Link href="/" title="Skeilab" onClick={onClose} className="flex items-center justify-center">
            <Image src="/logo.png" alt="Skeilab" width={38} height={38} className="rounded-lg" />
          </Link>
          <button onClick={onClose} className="lg:hidden absolute right-3 top-4 text-muted hover:text-foreground p-1">
            <X size={18} />
          </button>
        </div>

        {/* Navegación (rail de íconos) */}
        <nav className="flex-1 w-full overflow-y-auto py-3 flex flex-col items-center gap-1.5">
          <Link href="/" title="Inicio" onClick={onClose} className={railBtn(pathname === '/')}>
            <LayoutDashboard size={20} />
          </Link>


          {(verModelos || areasConMods.length > 0) && <div className="w-8 h-px bg-border my-1.5" />}

          {/* Modelos primero, por encima del resto */}
          {verModelos && (
            <Link href="/modelos" title="Modelos" onClick={onClose} className={railBtn(pathname.startsWith('/modelos'))}>
              <TaconIcon size={20} />
            </Link>
          )}

          {/* Un ícono por categoría → abre el flyout con sus módulos */}
          {areasConMods.map((area) => {
            const Icon = area.icon
            const active = areaActiva(area.key) || flyout?.key === area.key
            return (
              <button key={area.key} title={area.label} onClick={(e) => toggleFlyout(area.key, e)}
                className={railBtn(active)}>
                <Icon size={20} />
              </button>
            )
          })}

          {(role === 'admin' || role === 'manager') && (
            <button title="Usuarios y accesos" onClick={(e) => toggleFlyout('usuarios', e)}
              className={railBtn(pathname.startsWith('/usuarios') || flyout?.key === 'usuarios')}>
              <UserPlus size={20} />
            </button>
          )}
          {role === 'team_leader' && (
            <Link href="/usuarios" title="Chatters" onClick={onClose}
              className={railBtn(pathname.startsWith('/usuarios'))}>
              <UserPlus size={20} />
            </Link>
          )}
        </nav>

        <div className="w-full flex items-center justify-center py-3 border-t border-border">
          <Link href="/ajustes" title="Ajustes" onClick={onClose} className={railBtn(pathname.startsWith('/ajustes'))}>
            <Settings size={20} />
          </Link>
        </div>
      </aside>

      {/* FLYOUT: panel de módulos de la categoría clicada */}
      {abierta && (
        <div
          ref={flyoutRef}
          className="fixed z-40 w-60 rounded-2xl border shadow-2xl p-2"
          style={{
            left: 80,
            top: Math.min(flyout!.top, (typeof window !== 'undefined' ? window.innerHeight : 800) - 60 - abierta.mods.length * 44),
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            {abierta.label}
          </p>
          {abierta.mods.map((mod) => {
            const Icon = ICON_MAP[mod.icon]
            const isActive = pathname === `/${mod.slug}` || pathname.startsWith(`/${mod.slug}/`)
            return (
              <Link key={mod.id} href={`/${mod.slug}`} onClick={() => { setFlyout(null); onClose() }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                  ${isActive
                    ? 'bg-gold/10 text-gold font-medium'
                    : 'text-muted hover:text-foreground hover:bg-[var(--hover)]'}`}>
                {Icon && <Icon size={16} className="flex-shrink-0" />}
                <span className="truncate">{mod.name}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* FLYOUT: Usuarios y accesos */}
      {flyout?.key === 'usuarios' && (role === 'admin' || role === 'manager') && (
        <div ref={flyoutRef} className="fixed z-40 w-56 rounded-2xl border shadow-2xl p-2"
          style={{ left: 80, top: Math.min(flyout!.top, (typeof window !== 'undefined' ? window.innerHeight : 800) - 140), backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Usuarios y accesos</p>
          <Link href="/usuarios" onClick={() => { setFlyout(null); onClose() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-[var(--hover)]">
            <UserPlus size={16} className="flex-shrink-0" /> <span>Añadir empleado</span>
          </Link>
          <Link href="/usuarios?nuevo=modelo" onClick={() => { setFlyout(null); onClose() }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-[var(--hover)]">
            <UserCircle2 size={16} className="flex-shrink-0" /> <span>Añadir modelo</span>
          </Link>
        </div>
      )}
    </>
  )
}
