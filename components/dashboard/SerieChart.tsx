'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Punto { fecha: string; valor: number }
interface Props {
  serie: Punto[]
  hoy: string
  formato: 'money' | 'numero'
  gradId: string
}

const money = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
const fmtNum = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)
const fmtEjeNum = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`)
const fmtEjeMoney = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)
const fmtFecha = (f: string) => { const p = f.split('-'); return `${p[2]}/${p[1]}` }

const FILTROS = [
  { id: '15d', label: 'Últimos 15 días' },
  { id: 'q1', label: 'Primera quincena' },
  { id: 'q2', label: 'Segunda quincena' },
  { id: '30d', label: 'Últimos 30 días' },
] as const

function SerieTooltip({ active, payload, label, formato }: { active?: boolean; payload?: { value: number }[]; label?: string; formato: 'money' | 'numero' }) {
  if (!active || !payload || !payload.length) return null
  const v = payload[0].value
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
      <p style={{ color: 'var(--muted)' }}>{label ? fmtFecha(label) : ''}</p>
      <p className="font-semibold" style={{ color: 'var(--gold)' }}>{formato === 'money' ? money(v) : v.toLocaleString('en-US')}</p>
    </div>
  )
}

export default function SerieChart({ serie, hoy, formato, gradId }: Props) {
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

  const data = useMemo(() => serie.filter((p) => p.fecha >= rango.desde && p.fecha <= rango.hasta), [serie, rango])
  const hayDatos = useMemo(() => data.some((p) => p.valor > 0), [data])
  const total = useMemo(() => data.reduce((a, p) => a + p.valor, 0), [data])
  const ultimo = data.length ? data[data.length - 1].valor : 0
  const primero = useMemo(() => { const f = data.find((p) => p.valor > 0); return f ? f.valor : 0 }, [data])
  const delta = ultimo - primero

  const dominio = useMemo<[number | string, number | string]>(() => {
    if (formato === 'money') return [0, 'auto']
    const vals = data.filter((p) => p.valor > 0).map((p) => p.valor)
    if (!vals.length) return [0, 'auto']
    const dmin = Math.min(...vals), dmax = Math.max(...vals)
    const pad = Math.max(1, Math.round((dmax - dmin) * 0.2))
    return [Math.max(0, dmin - pad), dmax + pad]
  }, [data, formato])

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{formato === 'money' ? 'Facturación del periodo' : 'Seguidores ahora'}</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{formato === 'money' ? money(total) : fmtNum(ultimo)}</p>
          {formato === 'numero' && (
            <p className="text-[11px]" style={{ color: delta >= 0 ? '#4ADE80' : '#F87171' }}>
              {delta >= 0 ? '▲' : '▼'} {fmtNum(Math.abs(delta))} en el periodo
            </p>
          )}
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

      {!hayDatos ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-center px-4" style={{ color: 'var(--muted)' }}>
          Aún no hay datos en este periodo.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={20} />
            <YAxis domain={dominio} tickFormatter={(n) => (formato === 'money' ? fmtEjeMoney(n) : fmtEjeNum(n))} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={52} />
            <Tooltip content={<SerieTooltip formato={formato} />} />
            <Area type="monotone" dataKey="valor" stroke="var(--gold)" strokeWidth={2.5} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: 'var(--gold)' }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
