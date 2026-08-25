'use client'

import { useState } from 'react'
import { reportarVenta, eliminarReporte } from '@/app/(dashboard)/modulo-12/actions'
import { Plus, Trash2, CheckCircle2, Clock, XCircle } from 'lucide-react'

interface Modelo { id: string; model_name: string }
interface Reporte {
  id: string; modelo: string | null; fan_name: string | null
  monto: number; tipo: string | null; fecha_venta: string; estado: string
}

const TIPOS = ['subscription', 'tip', 'message']
const money = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const ESTADO = {
  confirmada: { label: 'Confirmada', color: '#22C55E', icon: CheckCircle2 },
  pendiente: { label: 'Pendiente', color: '#EAB308', icon: Clock },
  no_encontrada: { label: 'No encontrada', color: '#EF4444', icon: XCircle },
} as const

export default function MisVentas({ modelos, reportes }: { modelos: Modelo[]; reportes: Reporte[] }) {
  const [modeloId, setModeloId] = useState('')
  const [fanName, setFanName] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState('subscription')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const bruto = Number(monto) || 0
  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(false); setSaving(true)
    try {
      await reportarVenta({ modelo_id: modeloId || null, fan_name: fanName, monto: bruto, tipo })
      setOk(true); setFanName(''); setMonto(''); setTipo('subscription')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <form onSubmit={submit}
        className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
        style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Modelo</label>
          <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} required
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
            <option value="">Elegir…</option>
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.model_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Fan (nombre)</label>
          <input value={fanName} onChange={(e) => setFanName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="Nombre del fan…" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Monto (USD)</label>
          <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} required
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="0.00" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
            <Plus size={15} /> {saving ? 'Guardando…' : 'Reportar venta'}
          </button>
          {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
          {ok && <span className="text-xs" style={{ color: '#22C55E' }}>✓ Reportada — se confirmará contra Infloww</span>}
        </div>
      </form>

      {/* Historial */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6B6B80', borderBottom: '1px solid #1E1E2E' }}>
          Mis reportes
        </div>
        {reportes.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: '#6B6B80' }}>Aún no has reportado ventas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6B6B80' }}>
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
                  <tr key={r.id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: '#6B6B80' }}>
                      {new Date(r.fecha_venta).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{r.modelo ?? '—'}</td>
                    <td className="px-4 py-2">{r.fan_name ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{r.tipo ?? '—'}</td>
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
                        title="Eliminar" style={{ color: '#6B6B80' }}>
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
