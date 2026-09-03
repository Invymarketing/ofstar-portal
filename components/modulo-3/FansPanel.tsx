'use client'

import { useState } from 'react'
import type { Fan } from '@/components/modulo-3/Modulo3Tabs'

const money = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'potencia', label: '⭐ En potencia' },
  { id: 'activa', label: '🟢 Activas' },
  { id: 'enfriando', label: '🟡 Enfriándose' },
  { id: 'dormida', label: '🔴 Dormidas' },
] as const

export default function FansPanel({ fans }: { fans: Fan[] }) {
  const [filtro, setFiltro] = useState<string>('todos')
  const [q, setQ] = useState('')

  const lista = fans.filter((f) => {
    if (q && !(f.fan_name ?? f.fan_id).toLowerCase().includes(q.toLowerCase())) return false
    if (filtro === 'potencia') return f.en_potencia !== ''
    if (filtro === 'activa') return f.estado_fan === '🟢 Activa'
    if (filtro === 'enfriando') return f.estado_fan === '🟡 Enfriándose'
    if (filtro === 'dormida') return f.estado_fan === '🔴 Dormida'
    return true
  })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTROS.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: filtro === f.id ? 'var(--gold-15)' : 'var(--border)',
              color: filtro === f.id ? 'var(--gold)' : 'var(--muted)',
            }}>
            {f.label}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar fan…"
          className="ml-auto rounded-lg px-3 py-1.5 text-xs"
          style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
          {lista.length} fan{lista.length !== 1 ? 's' : ''}
        </div>
        {lista.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: 'var(--muted)' }}>Sin resultados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--muted)' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Tier</th>
                <th className="text-right font-normal px-4 py-2 text-xs">LTV</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Compras</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Ticket prom.</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Señal</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.fan_id} style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  <td className="px-4 py-2">{f.fan_name ?? f.fan_id}</td>
                  <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{f.modelo ?? '—'}</td>
                  <td className="px-4 py-2 text-center text-xs whitespace-nowrap">{f.tier}</td>
                  <td className="px-4 py-2 text-right font-medium" style={{ color: 'var(--gold)' }}>{money(f.ltv)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: 'var(--muted)' }}>{f.num_compras}</td>
                  <td className="px-4 py-2 text-right">{money(f.ticket_promedio)}</td>
                  <td className="px-4 py-2 text-center text-xs whitespace-nowrap">{f.estado_fan || '—'}</td>
                  <td className="px-4 py-2 text-center text-xs whitespace-nowrap">
                    {f.en_potencia || f.ballena_enfriandose || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
