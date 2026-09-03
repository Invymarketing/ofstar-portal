'use client'
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    let stored: string | null = null
    try { stored = localStorage.getItem('skeilab-theme') } catch (e) {}
    const isDark = stored === 'dark'
    if (isDark) document.documentElement.setAttribute('data-theme', 'dark')
    else document.documentElement.removeAttribute('data-theme')
    setDark(isDark)
  }, [])
  function toggle() {
    const el = document.documentElement
    const isDark = el.getAttribute('data-theme') === 'dark'
    if (isDark) el.removeAttribute('data-theme')
    else el.setAttribute('data-theme', 'dark')
    try { localStorage.setItem('skeilab-theme', isDark ? 'light' : 'dark') } catch (e) {}
    setDark(!isDark)
  }
  return (
    <button onClick={toggle} title={dark ? 'Modo dia' : 'Modo noche'} aria-label="Cambiar tema"
      className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-[var(--hover)] transition-colors">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
