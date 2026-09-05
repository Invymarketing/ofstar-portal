'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Target } from 'lucide-react'

interface Punto { fecha: string; monto: number }
interface Props {
  serie: Punto[]
  meta: number | null
  metaVendido: number
  quincenaLabel: string
  hoy: string
}

const money = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
const money2 = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtFecha = (f: string) => { const p = f.split('-'); return `${p[2]}/${p[1]}` }
const fmtEje = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)

const FILTROS = [
  { id: '15d', label: 'Últimos 15 días' },
  { id: 'q1', label: 'Primera quincena' },
  { id: 'q2', label: 'Segunda quincena' },
  { id: '30d', label: 'Últimos 30 días' },
] as const

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
      <p style={{ color: 'var(--muted)' }}>{label ? fmtFecha(label) : ''}</p>
      <p className="font-semibold" style={{ color: 'var(--gold)' }}>{money2(payload[0].value)}</p>
    </div>
  )
}

export default function VentasChart({ serie, meta, metaVendido, quincenaLabel, hoy }: Props) {
  const [filtro, setFiltro] = useState<string>('15d')
  const [hy, hm, hd] = hoy.split('-').map(Number)

  const rango = useMemo(() => {
    const mm = String(hm).padStart(2, '0')
    if (filtro === 'q1') return { desde: `${hy}-${mm}-01`, hasta: `${hy}-${mm}-15` }
    if (filtro === 'q2') {
      const ultimo = new Date(Date.UTC(hy, hm, 0)).getUTCDate()
      return { desde: `${hy}-${mm}-16`, hasta: `${hy}-${mm}-${String(ultimo).padStart(2, '0')}` }
    }
    const dias = filtro === '30d' ? 30 : 15
    const desde = new Date(Date.UTC(hy, hm - 1, hd) - (dias - 1) * 86400000).toISOString().slice(0, 10)
    return { desde, hasta: hoy }
  }, [filtro, hy, hm, hd, hoy])

  const data = useMemo(
    () => serie.filter((p) => p.fecha >= rango.desde && p.fecha <= rango.hasta),
    [serie, rango],
  )
  const total = useMemo(() => data.reduce((a, p) => a + p.monto, 0), [data])
  const maxDia = useMemo(() => data.reduce((a, p) => Math.max(a, p.monto), 0), [data])

  const pct = meta && meta > 0 ? Math.round((metaVendido / meta) * 100) : null
  const falta = meta && meta > 0 ? Math.max(meta - metaVendido, 0) : 0
  const metaColor = pct == null ? 'var(--muted)' : pct >= 100 ? '#22C55E' : pct >= 60 ? '#EAB308' : 'var(--gold)'

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {meta && meta > 0 ? (
        <div className="mb-5">
          <div className="flex items-end justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Target size={15} style={{ color: 'var(--gold)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Meta de la quincena {quincenaLabel}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                  {money(metaVendido)} <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>de {money(meta)}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold" style={{ color: metaColor }}>{pct}%</p>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{falta > 0 ? `te faltan ${money(falta)}` : '¡meta cumplida! 🎉'}</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct ?? 0, 100)}%`, backgroundColor: metaColor }} />
          </div>
        </div>
      ) : (
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Aún no tienes meta asignada para esta quincena.</p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Ventas del periodo</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{money(total)}</p>
        </div>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
          {FILTROS.map((f) => (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: filtro === f.id ? 'var(--gold-15)' : 'transparent', color: filtro === f.id ? 'var(--gold)' : 'var(--muted)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {maxDia === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-center px-4" style={{ color: 'var(--muted)' }}>
          Aún no hay ventas verificadas en este periodo. Cuando reportes ventas y se confirmen, aparecerán aquí.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={20} />
            <YAxis tickFormatter={fmtEje} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="monto" stroke="var(--gold)" strokeWidth={2.5} fill="url(#gradVentas)" dot={false} activeDot={{ r: 4, fill: 'var(--gold)' }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
