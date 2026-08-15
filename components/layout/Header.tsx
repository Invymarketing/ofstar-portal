'use client'

import { useState } from 'react'
import { Bell, Menu, LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'
import type { UserRole } from '@/types'

interface HeaderProps {
  fullName: string
  role: UserRole
  onMenuClick: () => void
}

export default function Header({ fullName, role, onMenuClick }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-muted hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications */}
      <button className="relative p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors">
        <Bell size={18} />
        {/* Notification badge — sin funcionalidad en Fase 1 */}
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-danger rounded-full" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2.5 pl-2 pr-1.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-gold">{initials}</span>
          </div>

          {/* Name + role */}
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-foreground leading-tight">{fullName}</p>
            <p className="text-[10px] text-muted leading-tight">{ROLE_LABELS[role]}</p>
          </div>

          <ChevronDown
            size={14}
            className={`text-muted transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{fullName}</p>
                <p className="text-xs text-muted mt-0.5">{ROLE_LABELS[role]}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <LogOut size={14} />
                  {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
