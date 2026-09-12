'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Check } from 'lucide-react'

interface Cuenta {
  id: string; ig_username: string; modelo: string; es_principal: boolean
  actividad: boolean; historia: boolean; reel: boolean; completada: boolean
}
type TareaKey = 'actividad' | 'historia' | 'reel'
const TAREAS: { key: TareaKey; label: string }[] = [
  { key: 'actividad', label: 'Actividad' },
  { key: 'historia', label: 'Historia' },
  { key: 'reel', label: 'Reel' },
]

export default function VaHoy() {
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null)
  const [precio, setPrecio] = useState(0)
  const [fecha, setFecha] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/control-va/hoy')
      const d = await r.json()
      setCuentas(d.cuentas ?? [])
      setPrecio(d.precio ?? 0)
      setFecha(d.fecha ?? '')
    } catch { setCuentas([]) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function toggle(c: Cuenta, tarea: TareaKey) {
    const valor = !c[tarea]
    setBusy(c.id + tarea)
    setCuentas((prev) => (prev ?? []).map((x) => {
      if (x.id !== c.id) return x
      const nx = { ...x, [tarea]: valor }
      nx.completada = nx.actividad && nx.historia && nx.reel
      return nx
    }))
    try {
      await fetch('/api/control-va/hoy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cuenta_id: c.id, tarea, valor }) })
    } catch { cargar() }
    setBusy(null)
  }

  if (cuentas === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: 'var(--muted)' }} /></div>

  const completadas = cuentas.filter((c) => c.completada).length
  const ganado = (completadas * precio).toFixed(2)
  const fechaLarga = fecha ? new Date(fecha + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }) : ''

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(120deg, var(--gold-15), transparent)', border: '1.5px solid var(--gold-25)' }}>
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{fechaLarga}</p>
        <div className="flex items-end gap-8 mt-2 flex-wrap">
          <div>
            <p className="text-3xl font-bold leading-none" style={{ color: 'var(--foreground)' }}>{completadas}<span className="text-base font-medium" style={{ color: 'var(--muted)' }}> / {cuentas.length} cuentas</span></p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>completadas hoy</p>
          </div>
          <div>
            <p className="text-3xl font-bold leading-none" style={{ color: 'var(--gold)' }}>${ganado}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>ganado hoy · ${precio.toFixed(3)}/cuenta</p>
          </div>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--muted)' }}>Marca las 3 tareas de cada cuenta. Una cuenta solo cuenta (y se paga) cuando tiene las 3 hechas.</p>

      <div className="space-y-2">
        {cuentas.map((c) => (
          <div key={c.id} className="rounded-xl p-3 flex items-center gap-3 flex-wrap" style={{ backgroundColor: c.completada ? 'var(--gold-15)' : 'var(--surface)', border: `1px solid ${c.completada ? 'var(--gold-25)' : 'var(--border)'}` }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>@{c.ig_username}</p>
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{c.modelo}</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {TAREAS.map((t) => {
                const on = c[t.key]
                const loading = busy === c.id + t.key
                return (
                  <button key={t.key} onClick={() => toggle(c, t.key)} disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-60"
                    style={{ backgroundColor: on ? 'var(--gold)' : 'var(--background)', color: on ? '#0D0D14' : 'var(--muted)', border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}` }}>
                    <span style={{ width: 15, height: 15, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${on ? '#0D0D14' : 'var(--border)'}` }}>
                      {on && <Check size={11} strokeWidth={3} />}
                    </span>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {cuentas.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No hay cuentas activas ahora mismo.</p>}
      </div>
    </div>
  )
}
