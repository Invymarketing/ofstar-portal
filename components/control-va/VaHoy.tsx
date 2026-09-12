'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Check, ChevronDown } from 'lucide-react'
import { TAREAS, type TareaKey } from '@/lib/control-va'

interface Cuenta { id: string; ig_username: string; modelo: string; tareas: Record<string, boolean>; completada: boolean }

export default function VaHoy() {
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null)
  const [minutos, setMinutos] = useState<Record<string, number>>({})
  const [tarifa, setTarifa] = useState(1.5)
  const [fecha, setFecha] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({})

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/control-va/hoy')
      const d = await r.json()
      const cs: Cuenta[] = (d.cuentas ?? []).map((c: Record<string, unknown>) => {
        const tareas: Record<string, boolean> = {}
        let all = true
        for (const t of TAREAS) { const v = !!c[t.key]; tareas[t.key] = v; if (!v) all = false }
        return { id: c.id as string, ig_username: c.ig_username as string, modelo: c.modelo as string, tareas, completada: all }
      })
      setCuentas(cs); setMinutos(d.minutos ?? {}); setTarifa(d.tarifaHora ?? 1.5); setFecha(d.fecha ?? '')
    } catch { setCuentas([]) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function toggle(c: Cuenta, tarea: TareaKey) {
    const valor = !c.tareas[tarea]
    setBusy(c.id + tarea)
    setCuentas((prev) => (prev ?? []).map((x) => {
      if (x.id !== c.id) return x
      const tareas = { ...x.tareas, [tarea]: valor }
      return { ...x, tareas, completada: TAREAS.every((t) => tareas[t.key]) }
    }))
    try {
      await fetch('/api/control-va/hoy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cuenta_id: c.id, tarea, valor }) })
    } catch { cargar() }
    setBusy(null)
  }

  if (cuentas === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: 'var(--muted)' }} /></div>

  const minTrabajados = cuentas.reduce((s, c) => s + TAREAS.reduce((a, t) => a + (c.tareas[t.key] ? (minutos[t.key] ?? 0) : 0), 0), 0)
  const completas = cuentas.filter((c) => c.completada).length
  const ganado = (minTrabajados / 60 * tarifa).toFixed(2)
  const fechaLarga = fecha ? new Date(fecha + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }) : ''

  const grupos = new Map<string, Cuenta[]>()
  for (const c of cuentas) { if (!grupos.has(c.modelo)) grupos.set(c.modelo, []); grupos.get(c.modelo)!.push(c) }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(120deg, var(--gold-15), transparent)', border: '1.5px solid var(--gold-25)' }}>
        <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{fechaLarga}</p>
        <div className="flex items-end gap-8 mt-2 flex-wrap">
          <div>
            <p className="text-3xl font-bold leading-none" style={{ color: 'var(--gold)' }}>${ganado}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>ganado hoy</p>
          </div>
          <div>
            <p className="text-2xl font-bold leading-none" style={{ color: 'var(--foreground)' }}>{minTrabajados}<span className="text-sm font-medium" style={{ color: 'var(--muted)' }}> min</span></p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>trabajados · ${tarifa.toFixed(2)}/h</p>
          </div>
          <div>
            <p className="text-2xl font-bold leading-none" style={{ color: 'var(--foreground)' }}>{completas}<span className="text-sm font-medium" style={{ color: 'var(--muted)' }}> / {cuentas.length}</span></p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>cuentas completas</p>
          </div>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--muted)' }}>Pulsa una modelo para ver sus cuentas y marcar cada tarea. Se te paga por cada casilla, según sus minutos.</p>

      <div className="space-y-2">
        {[...grupos.entries()].map(([modelo, lista]) => {
          const abierta = !!abiertas[modelo]
          const compl = lista.filter((c) => c.completada).length
          const todo = compl === lista.length
          return (
            <div key={modelo} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <button onClick={() => setAbiertas((s) => ({ ...s, [modelo]: !s[modelo] }))}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <ChevronDown size={16} style={{ color: 'var(--muted)', transform: abierta ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{modelo}</span>
                <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ backgroundColor: todo ? 'var(--gold-15)' : 'var(--background)', color: todo ? 'var(--gold)' : 'var(--muted)', border: `1px solid ${todo ? 'var(--gold-25)' : 'var(--border)'}` }}>
                  {compl}/{lista.length}
                </span>
              </button>

              {abierta && (
                <div className="px-3 pb-3 space-y-2">
                  {lista.map((c) => (
                    <div key={c.id} className="rounded-lg p-3" style={{ backgroundColor: c.completada ? 'var(--gold-15)' : 'var(--background)', border: `1px solid ${c.completada ? 'var(--gold-25)' : 'var(--border)'}` }}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>@{c.ig_username}</span>
                        {c.completada && <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>Completa ✓</span>}
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {TAREAS.map((t) => {
                          const on = c.tareas[t.key]
                          const loading = busy === c.id + t.key
                          return (
                            <button key={t.key} onClick={() => toggle(c, t.key)} disabled={loading}
                              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-60"
                              style={{ backgroundColor: on ? 'var(--gold)' : 'var(--surface)', color: on ? '#0D0D14' : 'var(--muted)', border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}` }}>
                              <span style={{ width: 15, height: 15, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${on ? '#0D0D14' : 'var(--border)'}` }}>
                                {on && <Check size={11} strokeWidth={3} />}
                              </span>
                              {t.label}
                              <span style={{ opacity: 0.6 }}>· {minutos[t.key] ?? t.defMin}m</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {cuentas.length === 0 && <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No hay cuentas incluidas ahora mismo. El admin las gestiona en Cuentas.</p>}
      </div>
    </div>
  )
}
