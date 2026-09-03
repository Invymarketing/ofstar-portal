'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, CreditCard, Gift, MessageSquare } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Venta } from '@/components/modulo-3/Modulo3Tabs'

const money = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 100 ? 2 : 0 })

const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 1 },
  { id: 'semana', label: 'Esta semana', dias: 7 },
  { id: 'mes', label: 'Este mes', dias: 30 },
] as const

// Categorías principales con ícono (como el panel de Infloww)
const TIPOS = [
  { key: 'subscription', label: 'Suscripciones', icon: CreditCard, color: '#22C55E' },
  { key: 'tip', label: 'Propinas', icon: Gift, color: 'var(--gold)' },
  { key: 'message', label: 'Mensajes', icon: MessageSquare, color: '#A855F7' },
] as const

const ESTADO_COLOR: Record<string, string> = { Completado: '#22C55E', Reverso: '#EF4444', Revision: '#EAB308' }

export default function VentasPanel({ ventas }: { ventas: Venta[] }) {
  const [rango, setRango] = useState<string>('mes')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroModelo, setFiltroModelo] = useState<string>('')
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Modelos presentes en las ventas (para el selector)
  const modelosPresentes = useMemo(() => {
    const s = new Set<string>()
    for (const v of ventas) if (v.modelo) s.add(v.modelo)
    return [...s].sort()
  }, [ventas])

  // Inicio del rango a medianoche de MADRID (Europe/Madrid), igual que Infloww,
  // para que "Hoy / Esta semana / Este mes" cuadren con su panel sin importar
  // la zona horaria del navegador.
  const inicio = useMemo(() => {
    const now = new Date()
    // Fecha y día de la semana actuales en Madrid
    const partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    }).formatToParts(now)
    const val = (t: string) => partes.find((p) => p.type === t)?.value ?? ''
    let y = Number(val('year')), m = Number(val('month')), d = Number(val('day'))
    const wd = val('weekday') // Mon, Tue, ...

    if (rango === 'mes') {
      d = 1
    } else if (rango === 'semana') {
      const orden = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const idx = Math.max(orden.indexOf(wd), 0) // días desde el lunes
      d = d - idx
    }

    // Offset de Madrid en esa fecha (GMT+1 o GMT+2 según horario de verano)
    const offStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid', timeZoneName: 'shortOffset',
    }).formatToParts(new Date(Date.UTC(y, m - 1, Math.max(d, 1))))
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'
    const signo = offStr.includes('-') ? -1 : 1
    const horas = Number(offStr.replace(/[^0-9]/g, '')) || 0

    // Medianoche de Madrid (y-m-d 00:00 hora Madrid) expresada en UTC real
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - signo * horas * 3600000)
  }, [rango])

  // Ventas del rango, excluyendo reembolsos (igual que "Net earnings" de Infloww)
  const enRango = useMemo(
    () => ventas.filter((v) =>
      v.estado !== 'Reverso'
      && new Date(v.fecha) >= inicio
      && (!filtroModelo || v.modelo === filtroModelo)
    ),
    [ventas, inicio, filtroModelo]
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

  // Reembolsos / reversos del rango. Infloww los INCLUYE en "Gross earnings";
  // nosotros los mostramos aparte para poder cuadrar los dos números.
  const reembolsos = useMemo(
    () => ventas
      .filter((v) =>
        v.estado === 'Reverso'
        && new Date(v.fecha) >= inicio
        && (!filtroModelo || v.modelo === filtroModelo)
      )
      .reduce((a, v) => ({ monto: a.monto + v.monto_bruto, n: a.n + 1 }), { monto: 0, n: 0 }),
    [ventas, inicio, filtroModelo]
  )

  // Clasifica el tipo de Infloww (Subscription, RecurringSubscription, Tips, Messages…)
  function categoria(tipo: string | null): string {
    const t = (tipo ?? '').toLowerCase()
    if (t.includes('subscription')) return 'subscription'
    if (t.includes('tip')) return 'tip'
    if (t.includes('message')) return 'message'
    return 'otro'
  }

  // Desglose por categoría
  const porTipo = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of enRango) {
      const c = categoria(v.tipo)
      m.set(c, (m.get(c) ?? 0) + v.monto_bruto)
    }
    return m
  }, [enRango])

  // Serie diaria para la gráfica (desde el inicio del rango hasta hoy)
  const serie = useMemo(() => {
    const desde = new Date(inicio)
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const dd = Math.max(Math.floor((+hoy - +desde) / 86400000) + 1, 1)
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
  }, [enRango, inicio])

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

  // Tipos presentes (para los chips del filtro de "Últimas ventas")
  const tiposPresentes = useMemo(() => {
    const s = new Set<string>()
    for (const v of enRango) if (v.tipo) s.add(v.tipo)
    return [...s].sort()
  }, [enRango])

  const recientes = useMemo(
    () =>
      [...enRango]
        .filter((v) => filtroTipo === 'todos' || v.tipo === filtroTipo)
        .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))
        .slice(0, 40),
    [enRango, filtroTipo]
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
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          {RANGOS.map((r) => (
            <button key={r.id} onClick={() => setRango(r.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: rango === r.id ? 'var(--gold-15)' : 'transparent',
                color: rango === r.id ? 'var(--gold)' : 'var(--muted)',
              }}>
              {r.label}
            </button>
          ))}
        </div>
        <select value={filtroModelo} onChange={(e) => setFiltroModelo(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-xs"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: filtroModelo ? 'var(--gold)' : 'var(--muted)' }}>
          <option value="">Todos los modelos</option>
          {modelosPresentes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex items-center gap-3 ml-auto">
          {msg && <span className="text-xs" style={{ color: 'var(--gold)' }}>{msg}</span>}
          <button onClick={sincronizar} disabled={syncing}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--border)', color: 'var(--foreground)' }}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Sincronizar Infloww'}
          </button>
        </div>
      </div>

      {/* Hero: ingresos totales + desglose por tipo (estilo Infloww) */}
      <div className="rounded-2xl border p-6 mb-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Ingresos totales <span style={{ color: 'rgba(107,107,128,0.7)' }}>(sin reembolsos)</span></p>
            <p className="text-4xl font-bold" style={{ color: 'var(--foreground)' }}>{money(total.bruto)}</p>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Comisión <span style={{ color: 'var(--gold)' }}>{money(total.comision)}</span> ·
              Neto modelos <span style={{ color: '#22C55E' }}> {money(total.neto)}</span> ·
              {total.n} ventas
            </p>
            {reembolsos.n > 0 && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
                Reembolsos <span style={{ color: '#EF4444' }}>−{money(reembolsos.monto)}</span> ({reembolsos.n}) ·
                Bruto con reembolsos <span style={{ color: 'var(--foreground)' }}>{money(total.bruto + reembolsos.monto)}</span>
                <span style={{ color: 'rgba(107,107,128,0.7)' }}> = "Gross" de Infloww</span>
              </p>
            )}
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
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{money(val)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{t.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Gráfica de ventas por día */}
      <div className="rounded-2xl border p-4 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Ventas por día</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <AreaChart data={serie} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={44}
                tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(value) => [money(Number(value) || 0), 'Ventas'] as [string, string]} />
              <Area type="monotone" dataKey="total" stroke="var(--gold)" strokeWidth={2} fill="url(#gVentas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Caja por modelo */}
      {porModelo.length > 0 && (
        <div className="rounded-2xl border mb-6 overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            Caja por modelo
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--muted)' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Ventas</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Bruto</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Comisión</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Neto</th>
              </tr>
            </thead>
            <tbody>
              {porModelo.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  <td className="px-4 py-2">{r.modelo}</td>
                  <td className="px-4 py-2 text-right" style={{ color: 'var(--muted)' }}>{r.n}</td>
                  <td className="px-4 py-2 text-right">{money(r.bruto)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: 'var(--gold)' }}>{money(r.comision)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#22C55E' }}>{money(r.neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Últimas ventas */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-medium mr-1" style={{ color: 'var(--muted)' }}>Últimas ventas</span>
          {['todos', ...tiposPresentes].map((t) => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium capitalize"
              style={{
                backgroundColor: filtroTipo === t ? 'var(--gold-15)' : 'var(--border)',
                color: filtroTipo === t ? 'var(--gold)' : 'var(--muted)',
              }}>
              {t === 'todos' ? 'Todos' : t}
            </button>
          ))}
        </div>
        {recientes.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: 'var(--muted)' }}>Sin ventas en este rango.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--muted)' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Fecha</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Chatter</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Tipo</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Bruto</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Neto</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                    {new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-2">{v.fan_name ?? '—'}</td>
                  <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{v.modelo ?? '—'}</td>
                  <td className="px-4 py-2" style={{ color: v.chatter ? 'var(--gold)' : 'var(--muted)' }}>{v.chatter ?? '—'}</td>
                  <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{v.tipo ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{money(v.monto_bruto)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#22C55E' }}>{money(v.venta_neto)}</td>
                  <td className="px-4 py-2 text-center text-xs" style={{ color: ESTADO_COLOR[v.estado] ?? 'var(--muted)' }}>{v.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
