'use client'

import { useMemo, useState } from 'react'
import { reportarVenta, eliminarReporte } from '@/app/(dashboard)/modulo-12/actions'
import { Plus, Trash2, CheckCircle2, Clock, XCircle } from 'lucide-react'

interface Modelo { id: string; model_name: string }
interface Reporte {
  id: string; modelo: string | null; fan_name: string | null
  monto: number; tipo: string | null; fecha_venta: string; estado: string
}
interface VentaAtribuida {
  id: string; fecha: string; fan_name: string | null; monto_bruto: number
  venta_neto: number; tipo: string | null; estado: string; modelo: string | null
}

const TIPOS = ['subscription', 'tip', 'message']
const money = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const RANGOS = [
  { id: 'hoy', label: 'Hoy', dias: 1 },
  { id: 'semana', label: 'Esta semana', dias: 7 },
  { id: 'mes', label: 'Este mes', dias: 30 },
] as const

const ESTADO = {
  confirmada: { label: 'Confirmada', color: '#22C55E', icon: CheckCircle2 },
  pendiente: { label: 'Pendiente', color: '#EAB308', icon: Clock },
  no_encontrada: { label: 'No encontrada', color: '#EF4444', icon: XCircle },
} as const

interface Meta { meta: number | null; vendido: number; quincena: string }

export default function MisVentas({
  modelos, reportes, ventas, meta,
}: { modelos: Modelo[]; reportes: Reporte[]; ventas: VentaAtribuida[]; meta?: Meta }) {
  const [modeloId, setModeloId] = useState('')
  const [fanName, setFanName] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState('subscription')
  const [rango, setRango] = useState<string>('mes')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const bruto = Number(monto) || 0
  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  const dias = RANGOS.find((r) => r.id === rango)?.dias ?? 30
  const inicio = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0)
    if (dias > 1) d.setDate(d.getDate() - (dias - 1))
    return d
  }, [dias])

  const totales = useMemo(() => {
    const enRango = ventas.filter((v) => v.estado !== 'Reverso' && new Date(v.fecha) >= inicio)
    return {
      n: enRango.length,
      bruto: enRango.reduce((a, v) => a + v.monto_bruto, 0),
    }
  }, [ventas, inicio])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(false); setSaving(true)
    try {
      await reportarVenta({ modelo_id: modeloId || null, fan_name: fanName, monto: bruto, tipo })
      setOk(true); setFanName(''); setMonto(''); setTipo('subscription')
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const pct = meta?.meta ? Math.round((meta.vendido / meta.meta) * 100) : null
  const falta = meta?.meta ? Math.max(meta.meta - meta.vendido, 0) : 0
  const metaColor = pct == null ? 'var(--muted)' : pct >= 100 ? '#22C55E' : pct >= 60 ? '#EAB308' : '#EF4444'

  return (
    <div className="space-y-6">
      {/* Meta de la quincena */}
      {meta && meta.meta ? (
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-end justify-between mb-2 flex-wrap gap-2">
            <div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Meta de la quincena {meta.quincena}</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {money(meta.vendido)} <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>de {money(meta.meta)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: metaColor }}>{pct}%</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{falta > 0 ? `te faltan ${money(falta)}` : '¡meta cumplida! 🎉'}</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct ?? 0, 100)}%`, backgroundColor: metaColor }} />
          </div>
        </div>
      ) : meta ? (
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Aún no tienes meta asignada para esta quincena.</p>
        </div>
      ) : null}

      {/* Totales del chatter */}
      <div>
        <div className="flex gap-1 p-1 rounded-xl mb-3 w-fit" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Tus ventas confirmadas</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{totales.n}</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Total vendido</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>{money(totales.bruto)}</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={submit}
        className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Modelo</label>
          <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} required
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
            <option value="">Elegir…</option>
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.model_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Fan (nombre)</label>
          <input value={fanName} onChange={(e) => setFanName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="Nombre del fan…" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Monto (USD)</label>
          <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} required
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="0.00" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
            <Plus size={15} /> {saving ? 'Guardando…' : 'Reportar venta'}
          </button>
          {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
          {ok && <span className="text-xs" style={{ color: '#22C55E' }}>✓ Reportada — se confirmará contra Infloww</span>}
        </div>
      </form>

      {/* Historial */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
          Mis reportes
        </div>
        {reportes.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: 'var(--muted)' }}>Aún no has reportado ventas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--muted)' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Fecha</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Tipo</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Monto</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {reportes.map((r) => {
                const est = ESTADO[r.estado as keyof typeof ESTADO] ?? ESTADO.pendiente
                const Icon = est.icon
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {new Date(r.fecha_venta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{r.modelo ?? '—'}</td>
                    <td className="px-4 py-2">{r.fan_name ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{r.tipo ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{money(r.monto)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="inline-flex items-center gap-1 text-xs" style={{ color: est.color }}>
                        <Icon size={13} /> {est.label}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={async () => {
                          if (!confirm('¿Eliminar este reporte?')) return
                          await eliminarReporte(r.id)
                          window.location.reload()
                        }}
                        title="Eliminar" style={{ color: 'var(--muted)' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
