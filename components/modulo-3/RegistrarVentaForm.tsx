'use client'

import { useState } from 'react'
import { registrarVenta } from '@/app/(dashboard)/modulo-3/actions'
import { Plus } from 'lucide-react'
import type { Modelo } from '@/components/modulo-3/Modulo3Tabs'

const TIPOS = ['subscription', 'tip', 'ppv', 'message', 'manual']

export default function RegistrarVentaForm({ modelos }: { modelos: Modelo[] }) {
  const [modeloId, setModeloId] = useState('')
  const [fanName, setFanName] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState('manual')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const bruto = Number(monto) || 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(false); setSaving(true)
    try {
      await registrarVenta({
        modelo_id: modeloId || null,
        fan_name: fanName,
        monto_bruto: bruto,
        tipo,
      })
      setOk(true)
      setFanName(''); setMonto(''); setTipo('manual')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  return (
    <form onSubmit={submit}
      className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl"
      style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
      <div>
        <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Modelo</label>
        <select value={modeloId} onChange={(e) => setModeloId(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          <option value="">— sin modelo —</option>
          {modelos.filter((m) => m.activa).map((m) => <option key={m.id} value={m.id}>{m.model_name}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Fan (nombre)</label>
        <input value={fanName} onChange={(e) => setFanName(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="Nombre del fan…" />
      </div>

      <div>
        <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Monto bruto (USD)</label>
        <input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} required
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="0.00" />
        {bruto > 0 && (
          <p className="text-xs mt-1" style={{ color: '#6B6B80' }}>
            Comisión <span style={{ color: '#C9A84C' }}>${(bruto * 0.2).toFixed(2)}</span> ·
            Neto <span style={{ color: '#22C55E' }}> ${(bruto * 0.8).toFixed(2)}</span>
          </p>
        )}
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
          <Plus size={15} /> {saving ? 'Guardando…' : 'Registrar venta'}
        </button>
        {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
        {ok && <span className="text-xs" style={{ color: '#22C55E' }}>✓ Venta registrada</span>}
      </div>
    </form>
  )
}
