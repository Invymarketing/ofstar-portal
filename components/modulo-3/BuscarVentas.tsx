'use client'

import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { buscarVentas, reasignarVenta, type VentaBuscada } from '@/app/(dashboard)/modulo-3/actions'
import type { Modelo } from '@/components/modulo-3/Modulo3Tabs'

interface ChatterOpt { id: string; nombre: string }

const money = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

function colorEstado(e: string): string {
  const s = (e ?? '').toLowerCase()
  if (s.includes('revers')) return 'var(--danger)'
  if (s.includes('revis')) return 'var(--warning)'
  return 'var(--success)'
}

export default function BuscarVentas({ modelos, chatters }: { modelos: Modelo[]; chatters: ChatterOpt[] }) {
  const [modeloId, setModeloId] = useState('')
  const [fecha, setFecha] = useState('')
  const [fan, setFan] = useState('')
  const [resultados, setResultados] = useState<VentaBuscada[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault()
    if (!modeloId && !fecha && !fan.trim()) { setError('Elige al menos un filtro'); return }
    setError(null); setCargando(true)
    try {
      const r = await buscarVentas({ modelo_id: modeloId || null, fecha: fecha || null, fan: fan || null })
      setResultados(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setCargando(false)
    }
  }

  async function reasignar(ventaId: string, chatterId: string) {
    const cid = chatterId || null
    try {
      await reasignarVenta(ventaId, cid)
      const nombre = cid ? (chatters.find((c) => c.id === cid)?.nombre ?? null) : null
      setResultados((prev) => prev?.map((v) => v.id === ventaId ? { ...v, chatter_id: cid, chatter: nombre } : v) ?? prev)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al reasignar')
    }
  }

  const total = (resultados ?? []).reduce((a, v) => a + (v.estado?.toLowerCase().includes('revers') ? 0 : v.monto_bruto), 0)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <form onSubmit={buscar} className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Modelo</label>
            <select value={modeloId} onChange={(e) => setModeloId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              <option value="">Todas</option>
              {modelos.map((m) => <option key={m.id} value={m.id}>{m.model_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Día</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Fan / usuario</label>
            <input value={fan} onChange={(e) => setFan(e.target.value)} placeholder="Nombre del fan…"
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button type="submit" disabled={cargando}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--background)' }}>
            {cargando ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {cargando ? 'Buscando…' : 'Buscar'}
          </button>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Busca en todo el histórico.</span>
          {error && <span className="text-xs" style={{ color: 'var(--danger)' }}>{error}</span>}
        </div>
      </form>

      {/* Resultados */}
      {resultados !== null && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: 'var(--muted)' }}>{resultados.length} ventas</span>
            <span style={{ color: 'var(--gold)' }}>· {money(total)}</span>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            {resultados.length === 0 ? (
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
                        <td className="px-4 py-2">
                          <select value={v.chatter_id ?? ''} onChange={(e) => reasignar(v.id, e.target.value)}
                            className="rounded-lg px-2 py-1 text-xs"
                            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: v.chatter_id ? 'var(--gold)' : 'var(--muted)' }}>
                            <option value="">sin asignar</option>
                            {chatters.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
