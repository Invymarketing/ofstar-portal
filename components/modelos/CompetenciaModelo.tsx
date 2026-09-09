'use client'

import { useState, useEffect, useMemo } from 'react'
import { Eye, Heart, Loader2, Film, ExternalLink, Trophy, Swords } from 'lucide-react'

interface ReelRef {
  url: string; thumbnail_url: string | null; caption: string
  views: number; likes: number; comentarios: number; ratio_vl: number
  fecha_publicacion: string | null; ig_username: string; grupo: string
  modelos_ref: { id: string; nombre: string }[]
}

const COLOR = 'var(--gold)'
function formatNum(n: number): string {
  if (n == null) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}
function score(r: ReelRef): number { return r.views + r.likes * 50 + r.comentarios * 100 }

export default function CompetenciaModelo({ modeloId }: { modeloId: string }) {
  const [reels, setReels] = useState<ReelRef[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<number>(30)
  const [orden, setOrden] = useState<'mejores' | 'vistos' | 'engagement' | 'recientes'>('mejores')

  useEffect(() => {
    setLoading(true)
    fetch('/api/reels?tipo=competencia')
      .then(r => r.json())
      .then(d => setReels(((d.reels ?? []) as ReelRef[]).filter(x => (x.modelos_ref || []).some(m => m.id === modeloId))))
      .catch(() => setReels([]))
      .finally(() => setLoading(false))
  }, [modeloId])

  const competidores = useMemo(() => Array.from(new Set(reels.map(r => r.grupo).filter(Boolean))), [reels])

  const filtrados = useMemo(() => {
    let lista = reels
    if (periodo !== 9999) {
      const limite = new Date(); limite.setDate(limite.getDate() - periodo)
      lista = lista.filter(r => r.fecha_publicacion && new Date(r.fecha_publicacion) >= limite)
    }
    const arr = [...lista]
    if (orden === 'vistos') arr.sort((a, b) => b.views - a.views)
    else if (orden === 'engagement') arr.sort((a, b) => (b.likes + b.comentarios) - (a.likes + a.comentarios))
    else if (orden === 'recientes') arr.sort((a, b) => (b.fecha_publicacion ?? '').localeCompare(a.fecha_publicacion ?? ''))
    else arr.sort((a, b) => score(b) - score(a))
    return arr
  }, [reels, periodo, orden])

  const media = useMemo(() => { const s = filtrados.map(score); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0 }, [filtrados])

  const chip = (activo: boolean) => ({
    backgroundColor: activo ? 'var(--gold-15)' : 'var(--surface)',
    color: activo ? COLOR : 'var(--muted)',
    border: activo ? '1px solid var(--gold-25)' : '1px solid var(--border)',
  }) as const

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Swords size={16} style={{ color: COLOR }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Competencia de la modelo</p>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>· mejores reels de sus competidores</span>
      </div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--muted)' }} /></div>}

      {!loading && reels.length === 0 && (
        <div className="text-center py-14 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)' }}>
          <Swords size={22} className="mx-auto mb-2" style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Esta modelo no tiene competencia asignada todavía.</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(139,139,158,0.7)' }}>Ve a Analytics &rarr; Competencia, entra en un competidor y pulsa &quot;Referencia de…&quot; para vincularlo a esta modelo.</p>
        </div>
      )}

      {!loading && reels.length > 0 && (
        <>
          {competidores.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Competidores:</span>
              {competidores.map((c, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'var(--gold-15)', color: COLOR, border: '1px solid var(--gold-25)' }}>{c}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Periodo:</span>
            {([[7, '7 días'], [14, '14 días'], [30, '30 días'], [9999, 'Todo']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setPeriodo(v)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={chip(periodo === v)}>{label}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Ordenar:</span>
            {([['mejores', 'Mejores'], ['vistos', 'Más vistos'], ['engagement', 'Más engagement'], ['recientes', 'Más recientes']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setOrden(v)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={chip(orden === v)}>{label}</button>
            ))}
          </div>

          {filtrados.length === 0 ? (
            <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)' }}>
              <Film size={20} className="mx-auto mb-2" style={{ color: 'var(--muted)' }} />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No hay reels en este periodo. Prueba con &quot;Todo&quot;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filtrados.slice(0, 24).map((reel, i) => {
                const recomendado = score(reel) > media
                return (
                  <a key={i} href={reel.url} target="_blank" rel="noopener noreferrer" className="group rounded-xl overflow-hidden transition-all" style={{ border: recomendado ? `1.5px solid ${COLOR}` : '1px solid var(--border)', backgroundColor: '#0D0D14' }}>
                    <div className="relative w-full" style={{ aspectRatio: '9/16', backgroundColor: 'var(--border)' }}>
                      {reel.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Film size={20} style={{ color: 'var(--muted)' }} /></div>
                      )}
                      {recomendado && (
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${COLOR}ee` }}>
                          <Trophy size={8} style={{ color: '#0D0D14' }} /><span className="text-[8px] font-bold" style={{ color: '#0D0D14' }}>TOP</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        <ExternalLink size={18} style={{ color: '#fff' }} />
                      </div>
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
                        <Eye size={9} style={{ color: '#fff' }} /><span className="text-[9px] font-bold" style={{ color: '#fff' }}>{formatNum(reel.views)}</span>
                      </div>
                    </div>
                    <div className="p-1.5">
                      <p className="text-[9px] font-medium truncate" style={{ color: 'var(--muted)' }}>@{reel.ig_username}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex items-center gap-0.5"><Heart size={8} style={{ color: 'var(--muted)' }} /><span className="text-[9px]" style={{ color: 'var(--foreground)' }}>{formatNum(reel.likes)}</span></div>
                        <span className="text-[9px] font-semibold ml-auto" style={{ color: COLOR }}>{reel.ratio_vl?.toFixed(0)}x</span>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
