'use client'

import type { Fan } from '@/components/modulo-3/Modulo3Tabs'

const money = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function BallenasPanel({ fans }: { fans: Fan[] }) {
  const ballenas = fans.filter((f) => f.tier === '🐋 Ballena').sort((a, b) => b.ltv - a.ltv)
  const enfriandose = ballenas.filter((f) => f.ballena_enfriandose !== '')

  return (
    <div>
      {/* Aviso de ballenas enfriándose */}
      {enfriandose.length > 0 && (
        <div className="rounded-2xl border p-4 mb-6" style={{ backgroundColor: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.25)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: '#60A5FA' }}>
            ❄️ {enfriandose.length} ballena{enfriandose.length > 1 ? 's' : ''} enfriándose
          </p>
          <p className="text-xs" style={{ color: '#6B6B80' }}>
            Llevan 7+ días sin comprar. Prioriza reactivarlas: {enfriandose.map((f) => f.fan_name ?? f.fan_id).slice(0, 8).join(', ')}
          </p>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6B6B80', borderBottom: '1px solid #1E1E2E' }}>
          🐋 Ballenas (LTV ≥ $300) · {ballenas.length}
        </div>
        {ballenas.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: '#6B6B80' }}>Aún no hay ballenas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6B6B80' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-right font-normal px-4 py-2 text-xs">LTV</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Compras</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Ticket prom.</th>
                <th className="text-right font-normal px-4 py-2 text-xs">Sin comprar</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ballenas.map((f) => (
                <tr key={f.fan_id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                  <td className="px-4 py-2">{f.fan_name ?? f.fan_id}</td>
                  <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{f.modelo ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-medium" style={{ color: '#C9A84C' }}>{money(f.ltv)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#6B6B80' }}>{f.num_compras}</td>
                  <td className="px-4 py-2 text-right">{money(f.ticket_promedio)}</td>
                  <td className="px-4 py-2 text-right" style={{ color: '#6B6B80' }}>
                    {f.dias_sin_comprar != null ? `${f.dias_sin_comprar}d` : '—'}
                  </td>
                  <td className="px-4 py-2 text-center text-xs whitespace-nowrap">
                    {f.ballena_enfriandose || f.estado_fan}
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
