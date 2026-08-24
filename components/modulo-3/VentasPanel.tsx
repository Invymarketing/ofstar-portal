'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Venta, Kpis, ModeloCaja } from '@/components/modulo-3/Modulo3Tabs'

const money = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const ESTADO_COLOR: Record<string, string> = {
  Completado: '#22C55E', Reverso: '#EF4444', Revision: '#EAB308',
}

export default function VentasPanel({
  ventas, kpis, porModelo, quincena,
}: { ventas: Venta[]; kpis: Kpis; porModelo: ModeloCaja[]; quincena: string }) {
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function sincronizar() {
    setSyncing(true); setMsg(null)
    try {
      const res = await fetch('/api/cron/sync-infloww', { credentials: 'include' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error')
      setMsg(`✓ ${j.ventas_procesadas} ventas · ${j.modelos_automapeados} modelos mapeados`)
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const card = (label: string, value: string, color: string) => (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
      <p className="text-xs mb-1" style={{ color: '#6B6B80' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  )

  return (
    <div>
      {/* Botón sincronizar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: '#6B6B80' }}>Totales de la quincena {quincena}</p>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs" style={{ color: '#C9A84C' }}>{msg}</span>}
          <button onClick={sincronizar} disabled={syncing}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#1E1E2E', color: '#F0F0F5' }}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando…' : 'Sincronizar Infloww'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {card('Bruto', money(kpis.bruto), '#F0F0F5')}
        {card('Comisión agencia (20%)', money(kpis.comision), '#C9A84C')}
        {card('Neto modelos (80%)', money(kpis.neto), '#22C55E')}
        {card('Ventas completadas', String(kpis.ventas), '#F0F0F5')}
      </div>

      {/* Desglose por modelo */}
      {porModelo.length > 0 && (
        <div className="rounded-2xl border mb-6 overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
          <div className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6B6B80', borderBottom: '1px solid #1E1E2E' }}>
            Caja por modelo
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6B6B80' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Ventas</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Bruto</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Comisión</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Neto</th>
              </tr>
            </thead>
            <tbody>
              {porModelo.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                  <td className="px-4 py-2">{r.modelo}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#6B6B80' }}>{r.ventas}</td>
                  <td className="px-4 py-2 text-right">{money(r.bruto)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#C9A84C' }}>{money(r.comision)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#22C55E' }}>{money(r.neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ventas recientes */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6B6B80', borderBottom: '1px solid #1E1E2E' }}>
          Últimas ventas
        </div>
        {ventas.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: '#6B6B80' }}>Aún no hay ventas registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6B6B80' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Fecha</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Tipo</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Bruto</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Neto</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Origen</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                  <td className="px-4 py-2 whitespace-nowrap" style={{ color: '#6B6B80' }}>
                    {new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-2">{v.fan_name ?? '—'}</td>
                  <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{v.modelo ?? '—'}</td>
                  <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{v.tipo ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{money(v.monto_bruto)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#22C55E' }}>{money(v.venta_neto)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="text-xs" style={{ color: ESTADO_COLOR[v.estado] ?? '#6B6B80' }}>{v.estado}</span>
                  </td>
                  <td className="px-4 py-2 text-center text-xs" style={{ color: '#6B6B80' }}>{v.origen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
