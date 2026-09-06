'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarIdioma, guardarNombre, cambiarPassword } from '@/app/(dashboard)/ajustes/actions'
import { User, SlidersHorizontal, Bell, Building2, Plug, Clock, Globe, Sun, Moon, Save, KeyRound } from 'lucide-react'

const IDIOMAS = [
  { code: 'es', label: 'Español' }, { code: 'en', label: 'English' }, { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' }, { code: 'it', label: 'Italiano' }, { code: 'ro', label: 'Română' },
]

type Item = { id: string; label: string; icon: React.ElementType; admin?: boolean }
const SECCIONES: Item[] = [
  { id: 'cuenta', label: 'Tu cuenta', icon: User },
  { id: 'preferencias', label: 'Preferencias', icon: SlidersHorizontal },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'agencia', label: 'Datos de la agencia', icon: Building2, admin: true },
  { id: 'conexiones', label: 'Conexiones', icon: Plug, admin: true },
  { id: 'operativa', label: 'Zona horaria y pagos', icon: Clock, admin: true },
]

const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const
const card = { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' } as const

function ComingSoon({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-6 text-center" style={card}>
      <span className="inline-block text-[11px] px-2 py-1 rounded-full mb-3" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>Próximamente</span>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{children}</p>
    </div>
  )
}

export default function AjustesClient({ nombre, email, rol, idiomaActual, esAdmin }: { nombre: string; email: string; rol: string; idiomaActual: string; esAdmin: boolean }) {
  const router = useRouter()
  const secciones = SECCIONES.filter((s) => !s.admin || esAdmin)
  const [sec, setSec] = useState('cuenta')

  const [nombreVal, setNombreVal] = useState(nombre)
  const [nombreMsg, setNombreMsg] = useState('')
  const [savingNombre, setSavingNombre] = useState(false)
  const [pass, setPass] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [passErr, setPassErr] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const [idioma, setIdioma] = useState(idiomaActual)
  const [idiomaMsg, setIdiomaMsg] = useState(false)
  const [tema, setTema] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    try {
      const t = localStorage.getItem('skeilab-theme')
      if (t === 'dark' || t === 'light') setTema(t)
      else setTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    } catch { /* ignore */ }
  }, [])

  function aplicarTema(t: 'light' | 'dark') {
    setTema(t)
    try { localStorage.setItem('skeilab-theme', t) } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', t)
  }
  async function onGuardarNombre() {
    setSavingNombre(true); setNombreMsg('')
    try { await guardarNombre(nombreVal); setNombreMsg('✓ Guardado'); router.refresh() } catch (e) { setNombreMsg(e instanceof Error ? e.message : 'Error') } finally { setSavingNombre(false); setTimeout(() => setNombreMsg(''), 2500) }
  }
  async function onCambiarPass() {
    setSavingPass(true); setPassMsg(''); setPassErr('')
    try { await cambiarPassword(pass); setPass(''); setPassMsg('✓ Contraseña actualizada') } catch (e) { setPassErr(e instanceof Error ? e.message : 'Error') } finally { setSavingPass(false); setTimeout(() => setPassMsg(''), 3000) }
  }
  async function onCambiarIdioma(code: string) {
    setIdioma(code)
    try { await guardarIdioma(code); setIdiomaMsg(true); setTimeout(() => setIdiomaMsg(false), 2500) } catch { /* ignore */ }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] items-start">
      <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1">
        {secciones.map((s) => {
          const Icon = s.icon
          const active = sec === s.id
          return (
            <button key={s.id} onClick={() => setSec(s.id)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all text-left flex-shrink-0"
              style={{ backgroundColor: active ? 'var(--gold-15)' : 'transparent', color: active ? 'var(--gold)' : 'var(--muted)' }}>
              <Icon size={16} className="flex-shrink-0" /> {s.label}
            </button>
          )
        })}
      </nav>

      <div className="min-w-0 space-y-5">
        {sec === 'cuenta' && (
          <>
            <div className="rounded-2xl border p-5" style={card}>
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Información personal</p>
              <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>Nombre</label>
              <div className="flex gap-2 mb-4">
                <input value={nombreVal} onChange={(e) => setNombreVal(e.target.value)} className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                <button onClick={onGuardarNombre} disabled={savingNombre} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 flex-shrink-0" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}><Save size={14} /> Guardar</button>
              </div>
              {nombreMsg && <p className="text-[11px] mb-3" style={{ color: nombreMsg.startsWith('✓') ? '#4ADE80' : '#F87171' }}>{nombreMsg}</p>}
              <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>Correo</label>
              <p className="text-sm px-3 py-2 rounded-lg mb-3 truncate" style={{ backgroundColor: 'var(--background)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{email || '—'}</p>
              <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>Rol</label>
              <p className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--background)', color: 'var(--gold)', border: '1px solid var(--border)' }}>{rol}</p>
            </div>
            <div className="rounded-2xl border p-5" style={card}>
              <div className="flex items-center gap-2 mb-3"><KeyRound size={15} style={{ color: 'var(--gold)' }} /><p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Cambiar contraseña</p></div>
              <div className="flex gap-2">
                <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Nueva contraseña (mín. 8)" className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                <button onClick={onCambiarPass} disabled={savingPass || pass.length < 8} className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 flex-shrink-0" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>Actualizar</button>
              </div>
              {passMsg && <p className="text-[11px] mt-1" style={{ color: '#4ADE80' }}>{passMsg}</p>}
              {passErr && <p className="text-[11px] mt-1" style={{ color: '#F87171' }}>{passErr}</p>}
            </div>
          </>
        )}

        {sec === 'preferencias' && (
          <>
            <div className="rounded-2xl border p-5" style={card}>
              <div className="flex items-center gap-2 mb-3"><Globe size={15} style={{ color: 'var(--gold)' }} /><p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Idioma</p></div>
              <select value={idioma} onChange={(e) => onCambiarIdioma(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
                {IDIOMAS.map((i) => <option key={i.code} value={i.code}>{i.label}</option>)}
              </select>
              <p className="text-[11px] mt-2" style={{ color: 'var(--muted)' }}>Es una preferencia tuya: no afecta a los demás. La traducción se irá activando por fases.</p>
              {idiomaMsg && <p className="text-[11px] mt-1" style={{ color: '#4ADE80' }}>✓ Guardado</p>}
            </div>
            <div className="rounded-2xl border p-5" style={card}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Tema</p>
              <div className="flex gap-2">
                <button onClick={() => aplicarTema('light')} className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium" style={{ backgroundColor: tema === 'light' ? 'var(--gold-15)' : 'var(--background)', color: tema === 'light' ? 'var(--gold)' : 'var(--muted)', border: '1px solid var(--border)' }}><Sun size={15} /> Claro</button>
                <button onClick={() => aplicarTema('dark')} className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium" style={{ backgroundColor: tema === 'dark' ? 'var(--gold-15)' : 'var(--background)', color: tema === 'dark' ? 'var(--gold)' : 'var(--muted)', border: '1px solid var(--border)' }}><Moon size={15} /> Oscuro</button>
              </div>
            </div>
          </>
        )}

        {sec === 'notificaciones' && <ComingSoon>Elegir qué avisos recibir y por dónde (dentro de la app, email o Telegram).</ComingSoon>}
        {sec === 'agencia' && <ComingSoon>Nombre y logo de tu agencia, para personalizar el CRM (marca blanca).</ComingSoon>}
        {sec === 'conexiones' && <ComingSoon>Conectar tus cuentas de Infloww, HikerAPI, Supalink y Telegram con sus claves. La base del onboarding para varias agencias.</ComingSoon>}
        {sec === 'operativa' && <ComingSoon>Zona horaria de la agencia, periodo de pago (quincena / semanal / mensual) y moneda.</ComingSoon>}
      </div>
    </div>
  )
}
