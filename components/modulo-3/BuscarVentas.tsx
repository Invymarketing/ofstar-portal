'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Venta, Modelo } from '@/components/modulo-3/Modulo3Tabs'

const money = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

function colorEstado(e: string): string {
  const s = (e ?? '').toLowerCase()
  if (s.includes('revers')) return 'var(--danger)'
  if (s.includes('revis')) return 'var(--warning)'
  return 'var(--success)'
}

export default function BuscarVentas({ ventas, modelos }: { ventas: Venta[]; modelos: Modelo[] }) {
  const [modelo, setModelo] = useState('')
  const [fecha, setFecha] = useState('')
  const [fan, setFan] = useState('')

  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  const resultados = useMemo(() => {
    const fanQ = fan.trim().toLowerCase()
    return ventas.filter((v) => {
      if (modelo && v.modelo !== modelo) return false
      if (fecha) {
        const d = new Date(v.fecha).toISOString().slice(0, 10)
        if (d !== fecha) return false
      }
      if (fanQ && !(v.fan_name ?? '').toLowerCase().includes(fanQ)) return false
      return true
    }).sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))
  }, [ventas, modelo, fecha, fan])

  const total = resultados.reduce((a, v) => a + (v.estado?.toLowerCase().includes('revers') ? 0 : v.monto_bruto), 0)
  const hayFiltro = modelo || fecha || fan.trim()

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-2xl border p-4 grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Modelo</label>
          <select value={modelo} onChange={(e) => setModelo(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
            <option value="">Todas</option>
            {modelos.map((m) => <option key={m.id} value={m.model_name}>{m.model_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Día</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Fan / usuario</label>
          <div className="flex items-center gap-2 rounded-lg px-3" style={inputStyle}>
            <Search size={14} style={{ color: 'var(--muted)' }} />
            <input value={fan} onChange={(e) => setFan(e.target.value)} placeholder="Buscar por nombre…"
              className="w-full bg-transparent py-2 text-sm outline-none" style={{ color: 'var(--foreground)' }} />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="flex items-center gap-3 text-sm">
        <span style={{ color: 'var(--muted)' }}>{resultados.length} ventas</span>
        <span style={{ color: 'var(--gold)' }}>· {money(total)}</span>
        {(modelo || fecha) && <span className="text-xs" style={{ color: 'var(--muted)' }}>
          {modelo || 'Todas'}{fecha ? ` · ${fecha}` : ''}
        </span>}
      </div>

      {/* Resultados */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        {!hayFiltro ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: 'var(--muted)' }}>
            Elige un modelo, un día o escribe un fan para buscar.
          </p>
        ) : resultados.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: 'var(--muted)' }}>Sin ventas con esos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal px-4 py-2 text-xs">Fecha</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Tipo</th>
                  <th className="text-right font-normal px-4 py-2 text-xs">Monto</th>
                  <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Asignada a</th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((v) => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{v.modelo ?? '—'}</td>
                    <td className="px-4 py-2">{v.fan_name ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{v.tipo ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{money(v.monto_bruto)}</td>
                    <td className="px-4 py-2 text-center text-xs" style={{ color: colorEstado(v.estado) }}>{v.estado}</td>
                    <td className="px-4 py-2" style={{ color: v.chatter ? 'var(--gold)' : 'var(--muted)' }}>
                      {v.chatter ?? 'sin asignar'}
                    </td>
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
