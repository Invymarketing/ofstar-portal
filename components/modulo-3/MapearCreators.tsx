'use client'

import { useState } from 'react'
import { mapearCreator } from '@/app/(dashboard)/modulo-3/actions'
import { Link2 } from 'lucide-react'
import type { Modelo, CreatorSinMapear } from '@/components/modulo-3/Modulo3Tabs'

export default function MapearCreators({
  modelos, sinMapear,
}: { modelos: Modelo[]; sinMapear: CreatorSinMapear[] }) {
  const [sel, setSel] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function asignar(creatorId: string) {
    const modeloId = sel[creatorId]
    if (!modeloId) return
    setError(null); setSaving(creatorId)
    try {
      await mapearCreator(modeloId, creatorId)
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setSaving(null)
    }
  }

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  return (
    <div>
      <div className="rounded-2xl border p-4 mb-4" style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}>
        <p className="text-sm" style={{ color: '#EAB308' }}>
          {sinMapear.length} cuenta{sinMapear.length !== 1 ? 's' : ''} de Infloww sin modelo
        </p>
        <p className="text-xs mt-1" style={{ color: '#6B6B80' }}>
          Asigna cada una a su modelo. Se corrige al instante y las próximas ventas quedan mapeadas solas.
        </p>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: '#6B6B80' }}>
              <th className="text-left font-normal px-4 py-2 text-xs">Cuenta Infloww</th>
              <th className="text-left font-normal px-4 py-2 text-xs">Fans de ejemplo</th>
              <th className="text-right font-normal px-4 py-2 text-xs">Ventas</th>
              <th className="text-left font-normal px-4 py-2 text-xs">Asignar modelo</th>
              <th className="px-2"></th>
            </tr>
          </thead>
          <tbody>
            {sinMapear.map((c) => (
              <tr key={c.creator_id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                <td className="px-4 py-2">{c.creator_name ?? <span style={{ color: '#6B6B80' }}>id {c.creator_id.slice(0, 10)}…</span>}</td>
                <td className="px-4 py-2 text-xs" style={{ color: '#6B6B80' }}>{c.ejemplos.join(', ') || '—'}</td>
                <td className="px-4 py-2 text-right" style={{ color: '#6B6B80' }}>{c.ventas}</td>
                <td className="px-4 py-2">
                  <select value={sel[c.creator_id] ?? ''} onChange={(e) => setSel({ ...sel, [c.creator_id]: e.target.value })}
                    className="rounded-lg px-2 py-1 text-xs" style={inputStyle}>
                    <option value="">Elegir…</option>
                    {modelos.filter((m) => m.activa).map((m) => <option key={m.id} value={m.id}>{m.model_name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => asignar(c.creator_id)} disabled={!sel[c.creator_id] || saving === c.creator_id}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-40"
                    style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
                    <Link2 size={12} /> {saving === c.creator_id ? '…' : 'Asignar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}
