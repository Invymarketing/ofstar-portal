'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, CreditCard, Gift, MessageSquare, FileText, Repeat, Radio } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Venta } from '@/components/modulo-3/Modulo3Tabs'

const money = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 100 ? 2 : 0 })

const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 1 },
  { id: 'semana', label: 'Esta semana', dias: 7 },
  { id: 'mes', label: 'Este mes', dias: 30 },
] as const

// Agrupa el `tipo` de Infloww en categorías con ícono (como el panel de Infloww)
const TIPOS = [
  { key: 'subscription', label: 'Suscripciones', icon: CreditCard, color: '#22C55E' },
  { key: 'tip', label: 'Propinas', icon: Gift, color: '#C9A84C' },
  { key: 'message', label: 'Mensajes', icon: MessageSquare, color: '#A855F7' },
  { key: 'post', label: 'Posts', icon: FileText, color: '#3B82F6' },
  { key: 'referral', label: 'Referidos', icon: Repeat, color: '#EF4444' },
  { key: 'stream', label: 'Streams', icon: Radio, color: '#06B6D4' },
] as const

const ESTADO_COLOR: Record<string, string> = { Completado: '#22C55E', Reverso: '#EF4444', Revision: '#EAB308' }

export default function VentasPanel({ ventas }: { ventas: Venta[] }) {
  const [rango, setRango] = useState<string>('mes')
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const dias = RANGOS.find((r) => r.id === rango)?.dias ?? 30

  // Inicio del rango (a medianoche local)
  const inicio = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    if (dias > 1) d.setDate(d.getDate() - (dias - 1))
    return d
  }, [dias])

  // Ventas del rango, excluyendo reembolsos (igual que "Net earnings" de Infloww)
  const enRango = useMemo(
    () => ventas.filter((v) => v.estado !== 'Reverso' && new Date(v.fecha) >= inicio),
    [ventas, inicio]
  )

  const total = useMemo(
    () =>
      enRango.reduce(
        (a, v) => ({
          bruto: a.bruto + v.monto_bruto,
          comision: a.comision + v.comision,
          neto: a.neto + v.venta_neto,
          n: a.n + 1,
        }),
        { bruto: 0, comision: 0, neto: 0, n: 0 }
      ),
    [enRango]
  )

  // Desglose por tipo
  const porTipo = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of enRango) m.set(v.tipo ?? 'otro', (m.get(v.tipo ?? 'otro') ?? 0) + v.monto_bruto)
    return m
  }, [enRango])

  // Serie diaria para la gráfica
  const serie = useMemo(() => {
    const dd = Math.max(dias, 1)
    const desde = new Date()
    desde.setHours(0, 0, 0, 0)
    desde.setDate(desde.getDate() - (dd - 1))
    const buckets: { dia: string; label: string; total: number }[] = []
    for (let i = 0; i < dd; i++) {
      const d = new Date(desde)
      d.setDate(desde.getDate() + i)
      buckets.push({
        dia: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        total: 0,
      })
    }
    const idx = new Map(buckets.map((b, i) => [b.dia, i]))
    for (const v of enRango) {
      const k = new Date(v.fecha).toISOString().slice(0, 10)
      const i = idx.get(k)
      if (i != null) buckets[i].total += v.monto_bruto
    }
    return buckets
  }, [enRango, dias])

  // Caja por modelo (en el rango)
  const porModelo = useMemo(() => {
    const m = new Map<string, { bruto: number; comision: number; neto: number; n: number }>()
    for (const v of enRango) {
      const key = v.modelo ?? 'Sin modelo'
      const cur = m.get(key) ?? { bruto: 0, comision: 0, neto: 0, n: 0 }
      cur.bruto += v.monto_bruto; cur.comision += v.comision; cur.neto += v.venta_neto; cur.n += 1
      m.set(key, cur)
    }
    return [...m.entries()].map(([modelo, x]) => ({ modelo, ...x })).sort((a, b) => b.bruto - a.bruto)
  }, [enRango])

  const recientes = useMemo(
    () => [...enRango].sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)).slice(0, 30),
    [enRango]
  )

  async function sincronizar() {
    setSyncing(true); setMsg(null)
    try {
      const res = await fetch('/api/cron/sync-infloww', { credentials: 'include' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error')
      setMsg(`✓ ${j.ventas_procesadas} ventas`)
      setTimeout(() => window.location.reload(), 1000)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      {/* Barra superior: rango + sincronizar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
          {RANGOS.map((r) => (
            <button key={r.id} onClick={() => setRango(r.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: rango === r.id ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: rango === r.id ? '#C9A84C' : '#8B8B9E',
              }}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs" style={{ color: '#C9A84C' }}>{msg}</span>}
          <button onClick={sincronizar} disabled={syncing}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#1E1E2E', color: '#F0F0F5' }}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Sincronizar Infloww'}
          </button>
        </div>
      </div>

      {/* Hero: ingresos totales + desglose por tipo (estilo Infloww) */}
      <div className="rounded-2xl border p-6 mb-4" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-xs mb-1" style={{ color: '#6B6B80' }}>Ingresos totales</p>
            <p className="text-4xl font-bold" style={{ color: '#F0F0F5' }}>{money(total.bruto)}</p>
            <p className="text-xs mt-2" style={{ color: '#6B6B80' }}>
              Comisión <span style={{ color: '#C9A84C' }}>{money(total.comision)}</span> ·
              Neto modelos <span style={{ color: '#22C55E' }}> {money(total.neto)}</span> ·
              {total.n} ventas
            </p>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 min-w-[260px]">
            {TIPOS.map((t) => {
              const Icon = t.icon
              const val = porTipo.get(t.key) ?? 0
              return (
                <div key={t.key} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${t.color}1A` }}>
                    <Icon size={15} style={{ color: t.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>{money(val)}</p>
                    <p className="text-[11px]" style={{ color: '#6B6B80' }}>{t.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Gráfica de ventas por día */}
      <div className="rounded-2xl border p-4 mb-6" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <p className="text-xs mb-3" style={{ color: '#6B6B80' }}>Ventas por día</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <AreaChart data={serie} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6B6B80', fontSize: 11 }} axisLine={false} tickLine={false}
                interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fill: '#6B6B80', fontSize: 11 }} axisLine={false} tickLine={false} width={44}
                tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#F0F0F5' }}
                formatter={(value) => [money(Number(value) || 0), 'Ventas'] as [string, string]} />
              <Area type="monotone" dataKey="total" stroke="#C9A84C" strokeWidth={2} fill="url(#gVentas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Caja por modelo */}
      {porModelo.length > 0 && (
        <div className="rounded-2xl border mb-6 overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
          <div className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6B6B80', borderBottom: '1px solid #1E1E2E' }}>
            Caja por modelo
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6B6B80' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Ventas</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Bruto</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Comisión</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Neto</th>
              </tr>
            </thead>
            <tbody>
              {porModelo.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                  <td className="px-4 py-2">{r.modelo}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#6B6B80' }}>{r.n}</td>
                  <td className="px-4 py-2 text-right">{money(r.bruto)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#C9A84C' }}>{money(r.comision)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#22C55E' }}>{money(r.neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Últimas ventas */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6B6B80', borderBottom: '1px solid #1E1E2E' }}>
          Últimas ventas
        </div>
        {recientes.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: '#6B6B80' }}>Sin ventas en este rango.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6B6B80' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Fecha</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Tipo</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Bruto</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Neto</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Origen</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                  <td className="px-4 py-2 whitespace-nowrap" style={{ color: '#6B6B80' }}>
                    {new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-2">{v.fan_name ?? '—'}</td>
                  <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{v.modelo ?? '—'}</td>
                  <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{v.tipo ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{money(v.monto_bruto)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#22C55E' }}>{money(v.venta_neto)}</td>
                  <td className="px-4 py-2 text-center text-xs" style={{ color: ESTADO_COLOR[v.estado] ?? '#6B6B80' }}>{v.estado}</td>
                  <td className="px-4 py-2 text-center text-xs" style={{ color: '#6B6B80' }}>{v.origen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
