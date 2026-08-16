'use client'

import { useState } from 'react'
import { ArrowLeft, RefreshCw, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Film } from 'lucide-react'
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
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E', color: '#8B8B9E' }}>
          <ArrowLeft size={13} /> Volver
        </button>
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ border: grupo.nicho ? `1.5px solid ${grupo.nicho.color}` : '1.5px solid #1E1E2E', backgroundColor: '#1E1E2E' }}>
          {grupo.profilePic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={grupo.profilePic} alt={grupo.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold" style={{ color: grupo.nicho?.color ?? '#8B8B9E' }}>{grupo.nombre[0]?.toUpperCase()}</div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: '#F0F0F5' }}>{grupo.nombre}</h2>
            {grupo.nicho && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${grupo.nicho.color}18`, color: grupo.nicho.color, border: `1px solid ${grupo.nicho.color}44` }}>{grupo.nicho.nombre}</span>}
          </div>
          <p className="text-xs" style={{ color: '#8B8B9E' }}>{grupo.totalCuentas} cuentas · {formatNum(grupo.totalSeguidores)} seguidores · {grupo.engagementMedio}% engagement</p>
        </div>
      </div>

      {/* Lista de cuentas de esta modelo */}
      <div className="space-y-3">
        {grupo.cuentas.map(cuenta => {
          const m = ultimaMetrica(cuenta)
          const seguidores = m?.seguidores ?? 0
          const isExpanded = expandedId === cuenta.id

          return (
            <div key={cuenta.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#1E1E2E' }}>
                  {cuenta.profile_pic_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cuenta.profile_pic_url} alt={cuenta.ig_username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: '#8B8B9E' }}>{cuenta.ig_username[0]?.toUpperCase()}</div>
                  )}
                </div>
                <button onClick={() => setExpandedId(isExpanded ? null : cuenta.id)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>@{cuenta.ig_username}</p>
                    {cuenta.es_principal && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>Principal</span>}
                  </div>
                  {cuenta.full_name && <p className="text-xs" style={{ color: '#8B8B9E' }}>{cuenta.full_name}</p>}
                </button>
                <div className="hidden sm:flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: '#F0F0F5' }}>{formatNum(seguidores)}</p>
                    <p className="text-xs" style={{ color: '#8B8B9E' }}>seguidores</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: '#F0F0F5' }}>{m?.engagement_rate ?? '—'}{m?.engagement_rate ? '%' : ''}</p>
                    <p className="text-xs" style={{ color: '#8B8B9E' }}>engagement</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => sincronizar(cuenta.id)} disabled={syncingId === cuenta.id} title="Actualizar" style={{ color: '#8B8B9E' }} className="p-1.5 rounded-lg hover:bg-white/5"><RefreshCw size={14} className={syncingId === cuenta.id ? 'animate-spin' : ''} /></button>
                  <button onClick={() => eliminar(cuenta.id)} title="Eliminar" style={{ color: '#8B8B9E' }} className="p-1.5 rounded-lg hover:bg-white/5 hover:text-red-400"><Trash2 size={14} /></button>
                  <button onClick={() => setExpandedId(isExpanded ? null : cuenta.id)} style={{ color: '#8B8B9E' }} className="p-1.5">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: '#1E1E2E' }}>
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: '#8B8B9E' }}>Últimos:</span>
                      {PERIODOS.map(d => (
                        <button key={d} onClick={() => setPeriodo(d)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: periodo === d ? 'rgba(201,168,76,0.15)' : '#0D0D14', color: periodo === d ? '#C9A84C' : '#8B8B9E', border: periodo === d ? '1px solid rgba(201,168,76,0.25)' : '1px solid #1E1E2E' }}>{d} días</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs" style={{ color: '#8B8B9E' }}>Ordenar:</span>
                      {ORDENES.map(([val, label]) => (
                        <button key={val} onClick={() => setOrden(val)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: orden === val ? 'rgba(201,168,76,0.15)' : '#0D0D14', color: orden === val ? '#C9A84C' : '#8B8B9E', border: orden === val ? '1px solid rgba(201,168,76,0.25)' : '1px solid #1E1E2E' }}>{label}</button>
                      ))}
                    </div>
                    {(cuenta.reels_analytics ?? []).length > 0 ? (
                      <ReelsGrid reels={cuenta.reels_analytics} dias={periodo} orden={orden} />
                    ) : (
                      <div className="text-center py-6 rounded-xl" style={{ backgroundColor: '#0D0D14', border: '1px dashed #1E1E2E' }}>
                        <Film size={18} className="mx-auto mb-2" style={{ color: '#8B8B9E' }} />
                        <p className="text-xs" style={{ color: '#8B8B9E' }}>Sin reels aún. Pulsa actualizar arriba.</p>
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
