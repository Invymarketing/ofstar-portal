'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Check, ArrowLeft } from 'lucide-react'
import { TAREAS, type TareaKey } from '@/lib/control-va'

interface Cuenta { id: string; ig_username: string; modelo: string; tareas: Record<string, boolean>; completada: boolean }

export default function VaHoy() {
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null)
  const [minutos, setMinutos] = useState<Record<string, number>>({})
  const [tarifa, setTarifa] = useState(1.5)
  const [fecha, setFecha] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const [modeloSel, setModeloSel] = useState<string>('')   // modelo elegido
  const [cuentaSel, setCuentaSel] = useState<string>('')   // cuenta elegida (id)
  const [guardado, setGuardado] = useState(false)          // aviso breve tras "Listo"

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

  // Modelos con sus cuentas
  const grupos = new Map<string, Cuenta[]>()
  for (const c of cuentas) { if (!grupos.has(c.modelo)) grupos.set(c.modelo, []); grupos.get(c.modelo)!.push(c) }
  const modelos = [...grupos.keys()].sort((a, b) => a.localeCompare(b))
  const cuentasModelo = modeloSel ? (grupos.get(modeloSel) ?? []) : []
  const cuenta = cuentaSel ? cuentas.find((c) => c.id === cuentaSel) ?? null : null

  const selStyle = { backgroundColor: 'var(--field)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  function elegirModelo(m: string) { setModeloSel(m); setCuentaSel(''); setGuardado(false) }

  return (
    <div className="space-y-4">
      {/* Resumen del día */}
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

      {cuentas.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No hay cuentas incluidas ahora mismo. El admin las gestiona en Cuentas.</p>
      ) : !cuenta ? (
        /* ── Selección: modelo → cuenta ── */
        <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Registrar una cuenta</p>

          {guardado && (
            <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)', border: '1px solid var(--gold-25)' }}>
              <Check size={15} /> Guardado. Elige otra cuenta cuando quieras.
            </div>
          )}

          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--muted)' }}>1 · Modelo</label>
            <select value={modeloSel} onChange={(e) => elegirModelo(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm" style={selStyle}>
              <option value="">— Elige una modelo —</option>
              {modelos.map((m) => {
                const l = grupos.get(m) ?? []
                const compl = l.filter((c) => c.completada).length
                return <option key={m} value={m}>{m} ({compl}/{l.length})</option>
              })}
            </select>
          </div>

          {modeloSel && (
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--muted)' }}>2 · Cuenta de {modeloSel}</label>
              <div className="space-y-2">
                {cuentasModelo.map((c) => (
                  <button key={c.id} onClick={() => { setCuentaSel(c.id); setGuardado(false) }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all"
                    style={{ backgroundColor: c.completada ? 'var(--gold-15)' : 'var(--field)', border: `1px solid ${c.completada ? 'var(--gold-25)' : 'var(--border)'}` }}>
                    <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>@{c.ig_username}</span>
                    {c.completada
                      ? <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>Completa ✓</span>
                      : <span className="text-xs" style={{ color: 'var(--muted)' }}>{TAREAS.filter((t) => c.tareas[t.key]).length}/{TAREAS.length}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Panel de una cuenta: marcar tareas + Listo ── */
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setCuentaSel('')} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>
              <ArrowLeft size={13} /> Volver
            </button>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{cuenta.modelo}</span>
          </div>
          <p className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>@{cuenta.ig_username}</p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Marca lo que has hecho en esta cuenta. Se guarda solo.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
            {TAREAS.map((t) => {
              const on = cuenta.tareas[t.key]
              const loading = busy === cuenta.id + t.key
              return (
                <button key={t.key} onClick={() => toggle(cuenta, t.key)} disabled={loading}
                  className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-all disabled:opacity-60"
                  style={{ backgroundColor: on ? 'var(--gold)' : 'var(--field)', color: on ? '#0D0D14' : 'var(--foreground)', border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}` }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${on ? '#0D0D14' : 'var(--border)'}` }}>
                    {loading ? <Loader2 size={12} className="animate-spin" /> : on && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-left leading-tight">{t.label}<br /><span style={{ opacity: 0.6, fontWeight: 400 }}>{minutos[t.key] ?? t.defMin} min</span></span>
                </button>
              )
            })}
          </div>

          <button onClick={() => { setCuentaSel(''); setGuardado(true) }}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all"
            style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
            <Check size={16} /> Listo con esta cuenta
          </button>
        </div>
      )}
    </div>
  )
}
