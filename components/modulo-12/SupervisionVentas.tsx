'use client'

import { useMemo, useState } from 'react'

interface Reporte {
  id: string; chatter: string; modelo: string | null
  fan_name: string | null; monto: number; tipo: string | null
  fecha_venta: string | null; estado: string | null; created_at: string
}

const money = (n: number) => '$' + Number(n || 0).toLocaleString('en-US')

function colorEstado(e: string | null): string {
  const s = (e ?? '').toLowerCase()
  if (s.includes('valid') || s.includes('confirm') || s.includes('cruz')) return '#22C55E'
  if (s.includes('pend') || s.includes('revis')) return '#EAB308'
  if (s.includes('rechaz') || s.includes('no')) return '#EF4444'
  return '#6B6B80'
}

export default function SupervisionVentas({ reportes }: { reportes: Reporte[] }) {
  const [chatter, setChatter] = useState('')

  const chatters = useMemo(
    () => [...new Set(reportes.map((r) => r.chatter).filter(Boolean))].sort(),
    [reportes]
  )

  const lista = useMemo(
    () => reportes.filter((r) => !chatter || r.chatter === chatter),
    [reportes, chatter]
  )

  // Resumen por chatter (sobre lo filtrado o todos)
  const resumen = useMemo(() => {
    const m = new Map<string, { n: number; total: number; validados: number }>()
    for (const r of lista) {
      const cur = m.get(r.chatter) ?? { n: 0, total: 0, validados: 0 }
      cur.n += 1
      cur.total += r.monto
      if (colorEstado(r.estado) === '#22C55E') cur.validados += 1
      m.set(r.chatter, cur)
    }
    return [...m.entries()].map(([nombre, x]) => ({ nombre, ...x })).sort((a, b) => b.total - a.total)
  }, [lista])

  return (
    <div className="space-y-6">
      {/* Resumen por chatter */}
      {resumen.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {resumen.map((c) => (
            <div key={c.nombre} className="rounded-xl px-4 py-3" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
              <p className="text-xs mb-1 truncate" style={{ color: '#6B6B80' }}>{c.nombre}</p>
              <p className="text-lg font-bold" style={{ color: '#C9A84C' }}>{money(c.total)}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#6B6B80' }}>{c.n} reportes · {c.validados} validados</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtro por chatter */}
      <div className="flex items-center gap-3">
        <select value={chatter} onChange={(e) => setChatter(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E', color: chatter ? '#C9A84C' : '#8B8B9E' }}>
          <option value="">Todos los chatters</option>
          {chatters.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs" style={{ color: '#6B6B80' }}>{lista.length} reportes</span>
      </div>

      {/* Tabla de reportes */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        {lista.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: '#6B6B80' }}>Sin reportes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: '#6B6B80' }}>
                  <th className="text-left font-normal px-4 py-2 text-xs">Fecha</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Chatter</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Tipo</th>
                  <th className="text-right font-normal px-4 py-2 text-xs">Monto</th>
                  <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: '#6B6B80' }}>
                      {new Date(r.fecha_venta ?? r.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-2" style={{ color: '#C9A84C' }}>{r.chatter}</td>
                    <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{r.modelo ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{r.fan_name ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{r.tipo ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{money(r.monto)}</td>
                    <td className="px-4 py-2 text-center text-xs" style={{ color: colorEstado(r.estado) }}>{r.estado ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
