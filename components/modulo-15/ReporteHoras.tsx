'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Clock } from 'lucide-react'

type Fila = { user_id: string; nombre: string; role: string; horas: number; tarifa: number; pago: number }

const md = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
function rangoSemana(): [string, string] {
  const p = md().split('-').map(Number)
  const dow = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()
  const off = (dow + 6) % 7
  const lun = new Date(Date.UTC(p[0], p[1] - 1, p[2]) - off * 86400000)
  return [lun.toISOString().slice(0, 10), md()]
}
function rangoQuincena(): [string, string] {
  const h = md(); const d = Number(h.slice(8, 10)); const [y, m] = h.split('-').map(Number)
  const fin = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return d <= 15 ? [h.slice(0, 8) + '01', h.slice(0, 8) + '15'] : [h.slice(0, 8) + '16', h.slice(0, 8) + String(fin)]
}
function rangoMes(): [string, string] {
  const h = md(); const [y, m] = h.split('-').map(Number)
  const fin = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return [h.slice(0, 8) + '01', h.slice(0, 8) + String(fin)]
}
const fmtHoras = (h: number) => { const H = Math.floor(h); const M = Math.round((h - H) * 60); return `${H}h ${M}m` }

export default function ReporteHoras() {
  const [desde, setDesde] = useState<string>(() => rangoQuincena()[0])
  const [hasta, setHasta] = useState<string>(() => rangoQuincena()[1])
  const [data, setData] = useState<{ filas: Fila[]; totalPago: number; totalHoras: number } | null>(null)
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async (d: string, h: string) => {
    setCargando(true)
    try {
      const r = await fetch(`/api/turnos/reporte?desde=${d}&hasta=${h}`)
      const j = await r.json()
      setData({ filas: j.filas ?? [], totalPago: j.totalPago ?? 0, totalHoras: j.totalHoras ?? 0 })
    } catch { setData({ filas: [], totalPago: 0, totalHoras: 0 }) }
    setCargando(false)
  }, [])
  useEffect(() => { cargar(desde, hasta) }, [desde, hasta, cargar])

  async function guardarTarifa(userId: string, tarifa: string) {
    await fetch('/api/turnos/tarifa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, tarifa: tarifa === '' ? 0 : Number(tarifa) }) })
    cargar(desde, hasta)
  }

  const preset = (r: [string, string]) => { setDesde(r[0]); setHasta(r[1]) }
  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const
  const presetBtn = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' } as const

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
        <Clock size={13} /> Horas y pago por trabajador
      </p>
      <div className="rounded-2xl border p-4 space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => preset([md(), md()])} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={presetBtn}>Hoy</button>
          <button onClick={() => preset(rangoSemana())} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={presetBtn}>Semana</button>
          <button onClick={() => preset(rangoQuincena())} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={presetBtn}>Quincena</button>
          <button onClick={() => preset(rangoMes())} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={presetBtn}>Mes</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs" style={{ color: 'var(--muted)' }}>Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg px-2.5 py-1.5 text-sm outline-none" style={inputStyle} />
          <label className="text-xs" style={{ color: 'var(--muted)' }}>Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg px-2.5 py-1.5 text-sm outline-none" style={inputStyle} />
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 text-xs font-semibold" style={{ backgroundColor: 'var(--background)', color: 'var(--muted)' }}>
            <span>Trabajador</span><span className="text-right w-20">Horas</span><span className="text-right w-20">$/hora</span><span className="text-right w-24">Pago</span>
          </div>
          {cargando ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
          ) : !data || data.filas.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>Sin datos en este rango.</p>
          ) : (
            <>
              {data.filas.map((f) => (
                <div key={f.user_id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 text-sm items-center" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{f.nombre}</span>
                  <span className="text-right w-20" style={{ color: f.horas ? 'var(--foreground)' : 'var(--muted)' }}>{fmtHoras(f.horas)}</span>
                  <span className="text-right w-20 flex items-center justify-end gap-1">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>$</span>
                    <input type="number" step="0.01" min="0" defaultValue={f.tarifa || ''} placeholder="0"
                      onBlur={(e) => { if (Number(e.target.value || 0) !== f.tarifa) guardarTarifa(f.user_id, e.target.value) }}
                      className="rounded-lg px-2 py-1 text-sm outline-none w-16 text-right" style={inputStyle} />
                  </span>
                  <span className="text-right w-24 font-semibold" style={{ color: 'var(--gold)' }}>${f.pago.toFixed(2)}</span>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 text-sm items-center" style={{ borderTop: '1.5px solid var(--gold-25)', backgroundColor: 'var(--gold-15)' }}>
                <span className="font-bold" style={{ color: 'var(--foreground)' }}>TOTAL</span>
                <span className="text-right w-20 font-bold" style={{ color: 'var(--foreground)' }}>{fmtHoras(data.totalHoras)}</span>
                <span className="text-right w-20"></span>
                <span className="text-right w-24 font-bold" style={{ color: 'var(--gold)' }}>${data.totalPago.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
        <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Solo cuenta turnos ya finalizados. El $/hora se guarda por persona; cambia el rango de fechas para ver el pago de esa horquilla.</p>
      </div>
    </div>
  )
}
