'use client'

import { useEffect, useState } from 'react'
import { Trophy, Loader2 } from 'lucide-react'

interface Row { pos: number; pct: number; esYo: boolean; nombre: string | null }

const colorPct = (p: number) => (p >= 80 ? '#22C55E' : p >= 50 ? 'var(--gold)' : '#F87171')

export default function RankingAgencia() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [mes, setMes] = useState('')

  useEffect(() => {
    let vivo = true
    fetch('/api/ranking')
      .then(r => r.json())
      .then(d => { if (vivo) { setRows(d.ranking ?? []); setMes(d.mes ?? '') } })
      .catch(() => { if (vivo) setRows([]) })
    return () => { vivo = false }
  }, [])

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={16} style={{ color: 'var(--gold)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Ranking de compromiso</p>
        {mes && <span className="text-xs" style={{ color: 'var(--muted)' }}>· {mes}</span>}
      </div>

      {rows === null ? (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>Aún no hay datos este mes. Se irá llenando cuando se cierre la primera semana con &quot;Nueva semana&quot;.</p>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {rows.map(r => (
            <div key={r.pos} className="flex items-center justify-between py-2.5 px-2 rounded-lg" style={{ borderColor: 'var(--border)', backgroundColor: r.esYo ? 'var(--gold-15)' : 'transparent' }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold w-5 text-center" style={{ color: r.pos === 1 ? 'var(--gold)' : 'var(--muted)' }}>{r.pos}</span>
                <span className="text-sm" style={{ color: r.esYo ? 'var(--gold)' : 'var(--foreground)', fontWeight: r.esYo ? 700 : 400 }}>
                  {r.nombre ?? 'Modelo anónima'}{r.esYo ? ' (tú)' : ''}
                </span>
                {r.pos === 1 && <span className="text-xs">🏆</span>}
              </div>
              <span className="text-sm font-semibold" style={{ color: colorPct(r.pct) }}>{r.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
