'use client'

import { useState } from 'react'
import { actualizarMeta } from '@/app/(dashboard)/modulo-16/actions'
import { Check } from 'lucide-react'

interface Fila {
  chatter_id: string; nombre: string; meta: number | null; ventas: number
  pct: number | null; falta: number | null; horas: number; por_hora: number | null
}
const money = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function MetasPanel({ filas }: { filas: Fila[] }) {
  const [edit, setEdit] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  async function guardar(id: string) {
    const val = edit[id]
    if (val === undefined) return
    setBusy(id)
    try { await actualizarMeta(id, val ? Number(val) : null); window.location.reload() } finally { setBusy(null) }
  }

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const
  const barColor = (p: number | null) => p == null ? '#6B6B80' : p >= 100 ? '#22C55E' : p >= 60 ? '#EAB308' : '#EF4444'

  return (
    <div className="rounded-2xl border overflow-x-auto" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: '#6B6B80' }}>
            <th className="text-left font-normal px-4 py-2.5 text-xs">Chatter</th>
            <th className="text-left font-normal px-4 py-2.5 text-xs" style={{ minWidth: 160 }}>Avance</th>
            <th className="text-right font-normal px-4 py-2.5 text-xs">Vendido</th>
            <th className="text-right font-normal px-4 py-2.5 text-xs">Meta</th>
            <th className="text-right font-normal px-4 py-2.5 text-xs">Falta</th>
            <th className="text-right font-normal px-4 py-2.5 text-xs">Horas</th>
            <th className="text-right font-normal px-4 py-2.5 text-xs">$/hora</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.chatter_id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
              <td className="px-4 py-2.5">{f.nombre}</td>
              <td className="px-4 py-2.5">
                {f.meta ? (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1" style={{ color: barColor(f.pct) }}>
                      <span>{f.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1E1E2E' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(f.pct ?? 0, 100)}%`, backgroundColor: barColor(f.pct) }} />
                    </div>
                  </div>
                ) : <span className="text-xs" style={{ color: '#6B6B80' }}>sin meta</span>}
              </td>
              <td className="px-4 py-2.5 text-right" style={{ color: '#C9A84C' }}>{money(f.ventas)}</td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex items-center gap-1 justify-end">
                  <input type="number" defaultValue={f.meta ?? ''} placeholder="—"
                    onChange={(e) => setEdit({ ...edit, [f.chatter_id]: e.target.value })}
                    className="w-20 rounded-lg px-2 py-1 text-xs text-right" style={inputStyle} />
                  <button onClick={() => guardar(f.chatter_id)} disabled={busy === f.chatter_id || edit[f.chatter_id] === undefined}
                    className="p-1 rounded-lg disabled:opacity-30" style={{ backgroundColor: '#1E1E2E', color: '#22C55E' }} title="Guardar meta">
                    <Check size={13} />
                  </button>
                </div>
              </td>
              <td className="px-4 py-2.5 text-right" style={{ color: '#6B6B80' }}>{f.falta != null ? money(f.falta) : '—'}</td>
              <td className="px-4 py-2.5 text-right" style={{ color: '#6B6B80' }}>{f.horas}h</td>
              <td className="px-4 py-2.5 text-right" style={{ color: '#22C55E' }}>{f.por_hora != null ? money(f.por_hora) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filas.length === 0 && <p className="text-sm px-4 py-6 text-center" style={{ color: '#6B6B80' }}>No hay chatters activos.</p>}
    </div>
  )
}
