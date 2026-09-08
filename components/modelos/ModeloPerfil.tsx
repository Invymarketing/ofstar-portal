'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, UserCircle2, CalendarDays, ListTodo, BarChart3, Link2 } from 'lucide-react'
import HorarioModelo from '@/components/modelos/HorarioModelo'
import MetricasModelo from '@/components/modelos/MetricasModelo'
import Portada from '@/components/modelos/Portada'

type TabKey = 'portada' | 'horario' | 'todo' | 'metricas'
const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'portada', label: 'Identidad', icon: UserCircle2 },
  { key: 'horario', label: 'Horario semanal', icon: CalendarDays },
  { key: 'todo', label: 'TO-DO List', icon: ListTodo },
  { key: 'metricas', label: 'Métricas RRSS', icon: BarChart3 },
]

export default function ModeloPerfil({ modeloId, nombre, foto, onBack }: {
  modeloId: string; nombre: string; foto: string | null; onBack: () => void
}) {
  const [tab, setTab] = useState<TabKey>('portada')

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-5 px-3 py-1.5 rounded-lg" style={{ color: 'var(--muted)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <ArrowLeft size={14} /> Volver a modelos
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-xl font-bold shrink-0" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>
          {foto ? <img src={foto} alt={nombre} className="w-full h-full object-cover object-center" /> : nombre[0]?.toUpperCase()}
        </div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{nombre}</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-[210px_minmax(0,1fr)] items-start">
        <nav className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {TABS.map((tb) => {
            const Icon = tb.icon
            const activo = tab === tb.key
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors shrink-0"
                style={{ backgroundColor: activo ? 'var(--gold-15)' : 'transparent', color: activo ? 'var(--gold)' : 'var(--muted)', border: `1px solid ${activo ? 'var(--gold-25)' : 'var(--border)'}` }}>
                <Icon size={16} /> {tb.label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0">
          {tab === 'portada' && (
            <div className="space-y-4">
              <VincularCuenta modeloId={modeloId} />
              <Portada modeloId={modeloId} nombre={nombre} foto={foto} />
            </div>
          )}
          {tab === 'horario' && <HorarioModelo modeloId={modeloId} seccion="horario" />}
          {tab === 'todo' && <HorarioModelo modeloId={modeloId} seccion="todo" />}
          {tab === 'metricas' && (
            <div className="space-y-4">
              <MetricasModelo modeloId={modeloId} />
              <ContenidoSemana modeloId={modeloId} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VincularCuenta({ modeloId }: { modeloId: string }) {
  const [cuentas, setCuentas] = useState<{ id: string; full_name: string | null }[]>([])
  const [actual, setActual] = useState<string>('')
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const r = await fetch(`/api/modelos/${modeloId}/cuenta`)
        const d = await r.json()
        if (!vivo) return
        setCuentas(d.cuentas ?? [])
        setActual(d.actual ?? '')
      } catch { /* noop */ }
    })()
    return () => { vivo = false }
  }, [modeloId])

  async function guardar(v: string) {
    setActual(v); setGuardado(false)
    await fetch(`/api/modelos/${modeloId}/cuenta`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: v || null }) })
    setGuardado(true); setTimeout(() => setGuardado(false), 2500)
  }

  return (
    <div className="rounded-2xl p-4 flex items-center gap-3 flex-wrap" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <Link2 size={15} style={{ color: 'var(--gold)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Cuenta de acceso</span>
      </div>
      <select value={actual} onChange={(e) => guardar(e.target.value)} className="text-sm rounded-lg px-2.5 py-1.5 outline-none" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
        <option value="">Sin vincular</option>
        {cuentas.map((c) => (<option key={c.id} value={c.id}>{c.full_name || c.id.slice(0, 8)}</option>))}
      </select>
      {guardado && <span className="text-xs" style={{ color: '#4ADE80' }}>Guardado ✓</span>}
      <span className="text-xs" style={{ color: 'var(--muted)' }}>Con qué cuenta entra la modelo para ver su horario.</span>
    </div>
  )
}

function ContenidoSemana({ modeloId }: { modeloId: string }) {
  const [resumen, setResumen] = useState<{ total: number; completas: number; pct: number | null } | null>(null)
  const [of, setOf] = useState<{ encontrado: boolean; entregado?: number; total?: number; porcentaje?: number } | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => { try { const res = await fetch(`/api/modelos/${modeloId}/contenido`); const data = await res.json(); if (vivo) setResumen(data.resumen ?? null) } catch { if (vivo) setResumen(null) } })()
    ;(async () => { try { const res = await fetch(`/api/modelos/${modeloId}/onlyfans`); const data = await res.json(); if (vivo) setOf(data.encontrado ? data : null) } catch { if (vivo) setOf(null) } })()
    return () => { vivo = false }
  }, [modeloId])

  const notionPct = resumen?.pct ?? null
  const ofPct = of?.porcentaje != null ? Math.round(of.porcentaje) : null

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Contenido de la semana</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1"><span className="text-xs" style={{ color: 'var(--muted)' }}>Notion (marketing)</span><span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{resumen ? `${resumen.completas}/${resumen.total}` : '—'}</span></div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}><div className="h-full rounded-full" style={{ width: `${notionPct ?? 0}%`, backgroundColor: (notionPct ?? 0) >= 100 ? '#4ADE80' : 'var(--gold)' }} /></div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1"><span className="text-xs" style={{ color: 'var(--muted)' }}>OnlyFans (Content Snare)</span><span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{of && of.total != null ? `${of.entregado}/${of.total}` : '—'}</span></div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}><div className="h-full rounded-full" style={{ width: `${ofPct ?? 0}%`, backgroundColor: (ofPct ?? 0) >= 100 ? '#4ADE80' : '#38BDF8' }} /></div>
        </div>
      </div>
    </div>
  )
}
