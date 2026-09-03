'use client'

import { useState } from 'react'
import { ArrowLeft, RefreshCw, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Film, Sparkles } from 'lucide-react'
import ReferenciaModelosModal from './ReferenciaModelosModal'
import { Grupo, Cuenta, formatNum, ultimaMetrica } from './analytics-utils'
import ReelsGrid, { OrdenReel } from './ReelsGrid'

interface Props {
  grupo: Grupo
  tipo: 'propia' | 'competencia'
  onBack: () => void
  onRefresh: () => void
}

const PERIODOS = [7, 14, 30]
const ORDENES: [OrdenReel, string][] = [['ganador', 'Mejores'], ['vistos', 'Más vistos'], ['engagement', 'Más engagement'], ['recientes', 'Más recientes']]

export default function GrupoDetalle({ grupo, tipo, onBack, onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(grupo.cuentas[0]?.id ?? null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState(7)
  const [orden, setOrden] = useState<OrdenReel>('ganador')
  const [modalRef, setModalRef] = useState(false)

  async function sincronizar(id: string) {
    setSyncingId(id)
    try {
      await fetch('/api/hikerapi/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cuenta_id: id }) })
      onRefresh()
    } catch {}
    setSyncingId(null)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta cuenta?')) return
    await fetch(`/api/cuentas?id=${id}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div>
      {/* Header del grupo */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          <ArrowLeft size={13} /> Volver
        </button>
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ border: grupo.nicho ? `1.5px solid ${grupo.nicho.color}` : '1.5px solid var(--border)', backgroundColor: 'var(--border)' }}>
          {grupo.profilePic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={grupo.profilePic} alt={grupo.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold" style={{ color: grupo.nicho?.color ?? 'var(--muted)' }}>{grupo.nombre[0]?.toUpperCase()}</div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{grupo.nombre}</h2>
            {grupo.nicho && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${grupo.nicho.color}18`, color: grupo.nicho.color, border: `1px solid ${grupo.nicho.color}44` }}>{grupo.nicho.nombre}</span>}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{grupo.totalCuentas} cuentas · {formatNum(grupo.totalSeguidores)} seguidores · {grupo.engagementMedio}% engagement</p>
        </div>
        {tipo === 'competencia' && grupo.cuentas[0] && (
          <button onClick={() => setModalRef(true)} className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all" style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-25)', color: 'var(--gold)' }}>
            <Sparkles size={13} /> Referencia de…
          </button>
        )}
      </div>

      {modalRef && grupo.cuentas[0] && (
        <ReferenciaModelosModal
          cuentaId={grupo.cuentas[0].id}
          nombreCompetidor={grupo.nombre}
          onClose={() => setModalRef(false)}
        />
      )}

      {/* Lista de cuentas de esta modelo */}
      <div className="space-y-3">
        {grupo.cuentas.map(cuenta => {
          const m = ultimaMetrica(cuenta)
          const seguidores = m?.seguidores ?? 0
          const isExpanded = expandedId === cuenta.id

          return (
            <div key={cuenta.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--border)' }}>
                  {cuenta.profile_pic_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cuenta.profile_pic_url} alt={cuenta.ig_username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: 'var(--muted)' }}>{cuenta.ig_username[0]?.toUpperCase()}</div>
                  )}
                </div>
                <button onClick={() => setExpandedId(isExpanded ? null : cuenta.id)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>@{cuenta.ig_username}</p>
                    {cuenta.es_principal && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>Principal</span>}
                  </div>
                  {cuenta.full_name && <p className="text-xs" style={{ color: 'var(--muted)' }}>{cuenta.full_name}</p>}
                </button>
                <div className="hidden sm:flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{formatNum(seguidores)}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>seguidores</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{m?.engagement_rate ?? '—'}{m?.engagement_rate ? '%' : ''}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>engagement</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => sincronizar(cuenta.id)} disabled={syncingId === cuenta.id} title="Actualizar" style={{ color: 'var(--muted)' }} className="p-1.5 rounded-lg hover:bg-[var(--hover)]"><RefreshCw size={14} className={syncingId === cuenta.id ? 'animate-spin' : ''} /></button>
                  <button onClick={() => eliminar(cuenta.id)} title="Eliminar" style={{ color: 'var(--muted)' }} className="p-1.5 rounded-lg hover:bg-[var(--hover)] hover:text-red-400"><Trash2 size={14} /></button>
                  <button onClick={() => setExpandedId(isExpanded ? null : cuenta.id)} style={{ color: 'var(--muted)' }} className="p-1.5">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>Últimos:</span>
                      {PERIODOS.map(d => (
                        <button key={d} onClick={() => setPeriodo(d)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: periodo === d ? 'var(--gold-15)' : '#0D0D14', color: periodo === d ? 'var(--gold)' : 'var(--muted)', border: periodo === d ? '1px solid var(--gold-25)' : '1px solid var(--border)' }}>{d} días</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>Ordenar:</span>
                      {ORDENES.map(([val, label]) => (
                        <button key={val} onClick={() => setOrden(val)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: orden === val ? 'var(--gold-15)' : '#0D0D14', color: orden === val ? 'var(--gold)' : 'var(--muted)', border: orden === val ? '1px solid var(--gold-25)' : '1px solid var(--border)' }}>{label}</button>
                      ))}
                    </div>
                    {(cuenta.reels_analytics ?? []).length > 0 ? (
                      <ReelsGrid reels={cuenta.reels_analytics} dias={periodo} orden={orden} />
                    ) : (
                      <div className="text-center py-6 rounded-xl" style={{ backgroundColor: '#0D0D14', border: '1px dashed var(--border)' }}>
                        <Film size={18} className="mx-auto mb-2" style={{ color: 'var(--muted)' }} />
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>Sin reels aún. Pulsa actualizar arriba.</p>
                      </div>
                    )}
                    {cuenta.ultima_sync && <p className="text-xs" style={{ color: 'rgba(139,139,158,0.5)' }}>Última actualización: {new Date(cuenta.ultima_sync).toLocaleString('es-ES')}</p>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
