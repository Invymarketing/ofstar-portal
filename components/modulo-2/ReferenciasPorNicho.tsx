'use client'

import { useState, useEffect, useMemo } from 'react'
import { Eye, Heart, MessageCircle, Loader2, Film, ExternalLink, Trophy, Sparkles } from 'lucide-react'

interface ReelRef {
  url: string; thumbnail_url: string | null; caption: string
  views: number; likes: number; comentarios: number; ratio_vl: number
  fecha_publicacion: string | null; ig_username: string; grupo: string
  nicho_id: string | null; nicho_nombre: string; nicho_color: string
}

function formatNum(n: number): string {
  if (n == null) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

// Score combinado views + engagement
function score(r: ReelRef): number {
  return r.views + r.likes * 50 + r.comentarios * 100
}

interface GrupoNicho {
  nicho_id: string
  nombre: string
  color: string
  reels: ReelRef[]     // ya filtrados por período y ordenados por score
  media: number
}

export default function ReferenciasPorNicho() {
  const [reels, setReels] = useState<ReelRef[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<7 | 14 | 30>(7)
  const [nichoSel, setNichoSel] = useState<string>('todos')
  const [orden, setOrden] = useState<'mejores' | 'vistos' | 'engagement' | 'recientes'>('mejores')

  useEffect(() => {
    setLoading(true)
    fetch('/api/reels?tipo=competencia')
      .then(r => r.json())
      .then(d => setReels(d.reels ?? []))
      .catch(() => setReels([]))
      .finally(() => setLoading(false))
  }, [])

  // Agrupar por nicho, filtrar por período, calcular media y ordenar por score
  const grupos = useMemo<GrupoNicho[]>(() => {
    const limite = new Date()
    limite.setDate(limite.getDate() - periodo)

    const enPeriodo = reels.filter(r => r.fecha_publicacion && new Date(r.fecha_publicacion) >= limite)

    const mapa = new Map<string, ReelRef[]>()
    for (const r of enPeriodo) {
      const key = r.nicho_id ?? 'sin-nicho'
      if (!mapa.has(key)) mapa.set(key, [])
      mapa.get(key)!.push(r)
    }

    const result: GrupoNicho[] = []
    for (const [key, lista] of mapa.entries()) {
      const scores = lista.map(score)
      const media = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      if (orden === 'vistos') lista.sort((a, b) => b.views - a.views)
      else if (orden === 'engagement') lista.sort((a, b) => (b.likes + b.comentarios) - (a.likes + a.comentarios))
      else if (orden === 'recientes') lista.sort((a, b) => (b.fecha_publicacion ?? '').localeCompare(a.fecha_publicacion ?? ''))
      else lista.sort((a, b) => score(b) - score(a))
      result.push({
        nicho_id: key,
        nombre: lista[0].nicho_nombre,
        color: lista[0].nicho_color,
        reels: lista,
        media,
      })
    }
    // Ordenar nichos por cantidad de reels
    result.sort((a, b) => b.reels.length - a.reels.length)
    return result
  }, [reels, periodo, orden])

  const gruposMostrados = nichoSel === 'todos' ? grupos : grupos.filter(g => g.nicho_id === nichoSel)

  return (
    <div>
      {/* Header + período */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={15} style={{ color: '#C9A84C' }} />
          <p className="text-sm font-medium" style={{ color: '#F0F0F5' }}>Referencias por nicho</p>
          <span className="text-xs" style={{ color: '#8B8B9E' }}>· mejores reels de competencia</span>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
          {([7, 14, 30] as const).map(d => (
            <button key={d} onClick={() => setPeriodo(d)} className="px-3 py-1 rounded-md text-xs font-medium transition-all" style={{ backgroundColor: periodo === d ? 'rgba(201,168,76,0.15)' : 'transparent', color: periodo === d ? '#C9A84C' : '#8B8B9E' }}>{d} días</button>
          ))}
        </div>
      </div>

      {/* Selector de nicho */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button onClick={() => setNichoSel('todos')} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: nichoSel === 'todos' ? 'rgba(201,168,76,0.15)' : '#13131A', color: nichoSel === 'todos' ? '#C9A84C' : '#8B8B9E', border: nichoSel === 'todos' ? '1px solid rgba(201,168,76,0.25)' : '1px solid #1E1E2E' }}>Todos</button>
        {grupos.map(g => (
          <button key={g.nicho_id} onClick={() => setNichoSel(g.nicho_id)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: nichoSel === g.nicho_id ? `${g.color}22` : '#13131A', color: nichoSel === g.nicho_id ? g.color : '#8B8B9E', border: nichoSel === g.nicho_id ? `1px solid ${g.color}66` : '1px solid #1E1E2E' }}>{g.nombre} <span style={{ opacity: 0.6 }}>{g.reels.length}</span></button>
        ))}
      </div>

      {/* Selector de orden */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-xs" style={{ color: '#8B8B9E' }}>Ordenar:</span>
        {([['mejores', 'Mejores'], ['vistos', 'Más vistos'], ['engagement', 'Más engagement'], ['recientes', 'Más recientes']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setOrden(val)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: orden === val ? 'rgba(201,168,76,0.15)' : '#13131A', color: orden === val ? '#C9A84C' : '#8B8B9E', border: orden === val ? '1px solid rgba(201,168,76,0.25)' : '1px solid #1E1E2E' }}>{label}</button>
        ))}
      </div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: '#8B8B9E' }} /></div>}

      {!loading && grupos.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: '#13131A', border: '1px dashed #1E1E2E' }}>
          <Film size={22} className="mx-auto mb-2" style={{ color: '#8B8B9E' }} />
          <p className="text-sm" style={{ color: '#8B8B9E' }}>No hay reels de competencia en los últimos {periodo} días.</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(139,139,158,0.7)' }}>Añade cuentas de competencia y sincronízalas para ver referencias.</p>
        </div>
      )}

      {/* Secciones por nicho */}
      {!loading && gruposMostrados.map(grupo => (
        <div key={grupo.nicho_id} className="mb-8">
          {/* Cabecera del nicho */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: grupo.color }} />
            <h3 className="text-sm font-bold" style={{ color: grupo.color }}>{grupo.nombre}</h3>
            <span className="text-xs" style={{ color: '#8B8B9E' }}>{grupo.reels.length} reels</span>
          </div>

          {/* Reels del nicho */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {grupo.reels.slice(0, 12).map((reel, i) => {
              const recomendado = score(reel) > grupo.media
              return (
                <a key={i} href={reel.url} target="_blank" rel="noopener noreferrer" className="group rounded-xl overflow-hidden transition-all" style={{ border: recomendado ? `1.5px solid ${grupo.color}` : '1px solid #1E1E2E', backgroundColor: '#0D0D14' }}>
                  <div className="relative w-full" style={{ aspectRatio: '9/16', backgroundColor: '#1E1E2E' }}>
                    {reel.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Film size={20} style={{ color: '#8B8B9E' }} /></div>
                    )}
                    {recomendado && (
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${grupo.color}ee` }}>
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
                    <p className="text-[9px] font-medium truncate" style={{ color: '#8B8B9E' }}>@{reel.ig_username}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex items-center gap-0.5"><Heart size={8} style={{ color: '#8B8B9E' }} /><span className="text-[9px]" style={{ color: '#F0F0F5' }}>{formatNum(reel.likes)}</span></div>
                      <span className="text-[9px] font-semibold ml-auto" style={{ color: grupo.color }}>{reel.ratio_vl?.toFixed(0)}x</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
