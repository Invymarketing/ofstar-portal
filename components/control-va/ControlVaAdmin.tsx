'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

type Fila = { va_id: string; nombre: string; completadas: number; incompletas: number; pago: number }
type VaCfg = { id: string; nombre: string; precio_override: number | null; activa: boolean }

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

export default function ControlVaAdmin() {
  const [tab, setTab] = useState<'reportes' | 'ajustes'>('reportes')
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(['reportes', 'ajustes'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: tab === t ? 'var(--gold-15)' : 'transparent', color: tab === t ? 'var(--gold)' : 'var(--muted)', border: `1px solid ${tab === t ? 'var(--gold-25)' : 'var(--border)'}` }}>
            {t === 'reportes' ? 'Reportes de pago' : 'Ajustes'}
          </button>
        ))}
      </div>
      {tab === 'reportes' ? <Reportes /> : <Ajustes />}
    </div>
  )
}

function Reportes() {
  const [desde, setDesde] = useState<string>(() => rangoQuincena()[0])
  const [hasta, setHasta] = useState<string>(() => rangoQuincena()[1])
  const [data, setData] = useState<{ filas: Fila[]; totalPago: number; totalCompletadas: number } | null>(null)
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(async (d: string, h: string) => {
    setCargando(true)
    try {
      const r = await fetch(`/api/control-va/reportes?desde=${d}&hasta=${h}`)
      const j = await r.json()
      setData({ filas: j.filas ?? [], totalPago: j.totalPago ?? 0, totalCompletadas: j.totalCompletadas ?? 0 })
    } catch { setData({ filas: [], totalPago: 0, totalCompletadas: 0 }) }
    setCargando(false)
  }, [])
  useEffect(() => { cargar(desde, hasta) }, [desde, hasta, cargar])

  const preset = (r: [string, string]) => { setDesde(r[0]); setHasta(r[1]) }
  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const
  const presetBtn = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' } as const

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => preset([md(), md()])} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={presetBtn}>Hoy</button>
        <button onClick={() => preset(rangoSemana())} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={presetBtn}>Esta semana</button>
        <button onClick={() => preset(rangoQuincena())} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={presetBtn}>Quincena</button>
        <button onClick={() => preset(rangoMes())} className="rounded-lg px-3 py-1.5 text-xs font-medium" style={presetBtn}>Este mes</button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs" style={{ color: 'var(--muted)' }}>Desde</label>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg px-2.5 py-1.5 text-sm outline-none" style={inputStyle} />
        <label className="text-xs" style={{ color: 'var(--muted)' }}>Hasta</label>
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg px-2.5 py-1.5 text-sm outline-none" style={inputStyle} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 text-xs font-semibold" style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)' }}>
          <span>VA</span><span className="text-right w-20">Completas</span><span className="text-right w-20">A medias</span><span className="text-right w-24">Pago</span>
        </div>
        {cargando ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
        ) : !data || data.filas.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No hay registros en este rango.</p>
        ) : (
          <>
            {data.filas.map((f) => (
              <div key={f.va_id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 text-sm items-center" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="font-medium truncate" style={{ color: 'var(--foreground)' }}>{f.nombre}</span>
                <span className="text-right w-20" style={{ color: 'var(--foreground)' }}>{f.completadas}</span>
                <span className="text-right w-20" style={{ color: f.incompletas ? '#F87171' : 'var(--muted)' }}>{f.incompletas}</span>
                <span className="text-right w-24 font-semibold" style={{ color: 'var(--gold)' }}>${f.pago.toFixed(2)}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 text-sm items-center" style={{ borderTop: '1.5px solid var(--gold-25)', backgroundColor: 'var(--gold-15)' }}>
              <span className="font-bold" style={{ color: 'var(--foreground)' }}>TOTAL</span>
              <span className="text-right w-20 font-bold" style={{ color: 'var(--foreground)' }}>{data.totalCompletadas}</span>
              <span className="text-right w-20"></span>
              <span className="text-right w-24 font-bold" style={{ color: 'var(--gold)' }}>${data.totalPago.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Ajustes() {
  const [precioGlobal, setPrecioGlobal] = useState('')
  const [vas, setVas] = useState<VaCfg[] | null>(null)
  const [guardado, setGuardado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/control-va/ajustes')
      const d = await r.json()
      setPrecioGlobal(String(d.precioGlobal ?? ''))
      setVas(d.vas ?? [])
    } catch { setVas([]) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function guardarGlobal() {
    await fetch('/api/control-va/ajustes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ precioGlobal: Number(precioGlobal) }) })
    setGuardado(true); setTimeout(() => setGuardado(false), 2000)
  }
  async function guardarVa(va: VaCfg, patch: Partial<VaCfg>) {
    const nuevo = { ...va, ...patch }
    setVas((prev) => (prev ?? []).map((v) => (v.id === va.id ? nuevo : v)))
    await fetch('/api/control-va/ajustes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ va_id: va.id, precio_override: nuevo.precio_override, activa: nuevo.activa }) })
  }

  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  if (vas === null) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" style={{ color: 'var(--muted)' }} /></div>

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Precio por cuenta (global)</p>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Lo que se paga por cada cuenta con las 3 tareas completas. Por defecto $0,375 (= $1,50/h ÷ 4 cuentas).</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: 'var(--muted)' }}>$</span>
          <input type="number" step="0.001" min="0" value={precioGlobal} onChange={(e) => setPrecioGlobal(e.target.value)} className="rounded-lg px-3 py-2 text-sm outline-none w-32" style={inputStyle} />
          <button onClick={guardarGlobal} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>Guardar</button>
          {guardado && <span className="text-xs" style={{ color: '#4ADE80' }}>Guardado ✓</span>}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Precio por VA (opcional)</p>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Deja en blanco para usar el precio global. Puedes desactivar una VA temporalmente.</p>
        {vas.length === 0 ? (
          <p className="text-sm py-3" style={{ color: 'var(--muted)' }}>No hay usuarios con rol VA todavía.</p>
        ) : (
          <div className="space-y-2">
            {vas.map((v) => (
              <div key={v.id} className="flex items-center gap-3 flex-wrap py-2" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{v.nombre}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>$</span>
                  <input type="number" step="0.001" min="0" defaultValue={v.precio_override ?? ''} placeholder={precioGlobal}
                    onBlur={(e) => guardarVa(v, { precio_override: e.target.value === '' ? null : Number(e.target.value) })}
                    className="rounded-lg px-2.5 py-1.5 text-sm outline-none w-24" style={inputStyle} />
                </div>
                <button onClick={() => guardarVa(v, { activa: !v.activa })} className="rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: v.activa ? 'var(--gold-15)' : 'var(--background)', color: v.activa ? 'var(--gold)' : 'var(--muted)', border: `1px solid ${v.activa ? 'var(--gold-25)' : 'var(--border)'}` }}>
                  {v.activa ? 'Activa' : 'Inactiva'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
