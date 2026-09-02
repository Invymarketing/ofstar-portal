'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Menu, LogOut, ChevronDown, CheckCheck, CheckSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ROLE_LABELS } from '@/lib/roles'
import type { UserRole } from '@/types'

interface HeaderProps {
  fullName: string
  role: UserRole
  onMenuClick: () => void
}

interface Notif { id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string }

export default function Header({ fullName, role, onMenuClick }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [tareasPend, setTareasPend] = useState(0)
  const router = useRouter()

  const cargar = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, link, read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifs(data ?? [])
      const { count } = await supabase
        .from('tareas')
        .select('id', { count: 'exact', head: true })
        .eq('asignado_a', user.id).eq('estado', 'pendiente')
      setTareasPend(count ?? 0)
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 45000)
    return () => clearInterval(t)
  }, [cargar])

  const noLeidas = notifs.filter((n) => !n.read).length

  async function abrir(n: Notif) {
    const supabase = createClient()
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id)
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    }
    setShowNotifs(false)
    if (n.link) router.push(n.link)
  }

  async function marcarTodas() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifs((prev) => prev.map((x) => ({ ...x, read: true })))
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  function hace(iso: string) {
    const s = Math.floor((Date.now() - +new Date(iso)) / 1000)
    if (s < 60) return 'ahora'
    if (s < 3600) return `hace ${Math.floor(s / 60)}m`
    if (s < 86400) return `hace ${Math.floor(s / 3600)}h`
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
      <button onClick={onMenuClick} className="lg:hidden text-muted hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors">
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      {/* Tareas (acceso rápido) */}
      <button onClick={() => router.push('/modulo-14')} title="Tareas"
        className="relative p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors">
        <CheckSquare size={18} />
        {tareasPend > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>{tareasPend > 9 ? '9+' : tareasPend}</span>
        )}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button onClick={() => setShowNotifs(!showNotifs)}
          className="relative p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors">
          <Bell size={18} />
          {noLeidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ backgroundColor: '#EF4444', color: '#fff' }}>{noLeidas > 9 ? '9+' : noLeidas}</span>
          )}
        </button>

        {showNotifs && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowNotifs(false)} />
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-surface border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <p className="text-sm font-medium text-foreground">Notificaciones</p>
                {noLeidas > 0 && (
                  <button onClick={marcarTodas} className="flex items-center gap-1 text-[11px]" style={{ color: '#C9A84C' }}>
                    <CheckCheck size={12} /> marcar leídas
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-xs text-center py-8 text-muted">Sin notificaciones.</p>
                ) : (
                  notifs.map((n) => (
                    <button key={n.id} onClick={() => abrir(n)}
                      className="w-full text-left px-4 py-3 border-b border-border hover:bg-white/5 transition-colors flex gap-2.5"
                      style={{ backgroundColor: n.read ? 'transparent' : 'rgba(201,168,76,0.05)' }}>
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: n.read ? 'transparent' : '#C9A84C' }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{n.title}</p>
                        {n.body && <p className="text-[11px] text-muted mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-muted/70 mt-0.5">{hace(n.created_at)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2.5 pl-2 pr-1.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-gold">{initials}</span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-foreground leading-tight">{fullName}</p>
            <p className="text-[10px] text-muted leading-tight">{ROLE_LABELS[role]}</p>
          </div>
          <ChevronDown size={14} className={`text-muted transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{fullName}</p>
                <p className="text-xs text-muted mt-0.5">{ROLE_LABELS[role]}</p>
              </div>
              <div className="p-1.5">
                <button onClick={handleLogout} disabled={loggingOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50">
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
