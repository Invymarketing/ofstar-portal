'use client'

import { useMemo } from 'react'
import { Eye, Heart, MessageCircle, Trophy, ExternalLink, Film } from 'lucide-react'

interface Reel {
  url: string
  thumbnail_url: string | null
  caption: string
  views: number
  likes: number
  comentarios: number
  ratio_vl: number
  fecha_publicacion: string | null
}

export type OrdenReel = 'ganador' | 'vistos' | 'engagement' | 'recientes'

interface Props {
  reels: Reel[]
  dias: number
  orden?: OrdenReel   // por defecto 'ganador' (score)
}

function formatNum(n: number): string {
  if (n == null) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function calcScore(r: Reel): number {
  return r.views + r.likes * 50 + r.comentarios * 100
}

export default function ReelsGrid({ reels, dias, orden = 'ganador' }: Props) {
  const { filtrados, ganadores } = useMemo(() => {
    const limite = new Date()
    limite.setDate(limite.getDate() - dias)

    const filtrados = reels.filter(r => {
      if (!r.fecha_publicacion) return false
      return new Date(r.fecha_publicacion) >= limite
    })

    if (filtrados.length === 0) return { filtrados: [], ganadores: new Set<string>() }

    // Los "ganadores" (badge dorado) siempre se calculan sobre el score, independiente del orden
    const scores = filtrados.map(calcScore)
    const media = scores.reduce((a, b) => a + b, 0) / scores.length
    const ganadores = new Set(filtrados.filter(r => calcScore(r) > media).map(r => r.url))

    // Ordenar según el criterio elegido
    if (orden === 'vistos') filtrados.sort((a, b) => b.views - a.views)
    else if (orden === 'engagement') filtrados.sort((a, b) => (b.likes + b.comentarios) - (a.likes + a.comentarios))
    else if (orden === 'recientes') filtrados.sort((a, b) => (b.fecha_publicacion ?? '').localeCompare(a.fecha_publicacion ?? ''))
    else filtrados.sort((a, b) => calcScore(b) - calcScore(a)) // 'ganador' = score

    return { filtrados, ganadores }
  }, [reels, dias, orden])

  if (filtrados.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl" style={{ backgroundColor: '#0D0D14', border: '1px dashed var(--border)' }}>
        <Film size={20} className="mx-auto mb-2" style={{ color: 'var(--muted)' }} />
        <p className="text-xs" style={{ color: 'var(--muted)' }}>No hay reels en los últimos {dias} días.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {filtrados.length} reels · {ganadores.size} ganador{ganadores.size !== 1 ? 'es' : ''} sobre la media
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtrados.map((reel, i) => {
          const esGanador = ganadores.has(reel.url)
          return (
            <a key={i} href={reel.url} target="_blank" rel="noopener noreferrer" className="group relative rounded-xl overflow-hidden transition-all" style={{ border: esGanador ? '1.5px solid var(--gold)' : '1px solid var(--border)', backgroundColor: '#0D0D14' }}>
              {esGanador && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(201,168,76,0.9)' }}>
                  <Trophy size={9} style={{ color: '#0D0D14' }} />
                  <span className="text-[9px] font-bold" style={{ color: '#0D0D14' }}>GANADOR</span>
                </div>
              )}
              <div className="relative w-full" style={{ aspectRatio: '9/16', backgroundColor: 'var(--border)' }}>
                {reel.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reel.thumbnail_url} alt="reel" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Film size={24} style={{ color: 'var(--muted)' }} /></div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <ExternalLink size={20} style={{ color: '#fff' }} />
                </div>
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                  <Eye size={10} style={{ color: '#fff' }} />
                  <span className="text-[10px] font-semibold" style={{ color: '#fff' }}>{formatNum(reel.views)}</span>
                </div>
              </div>
              <div className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5"><Heart size={9} style={{ color: 'var(--muted)' }} /><span className="text-[10px]" style={{ color: 'var(--foreground)' }}>{formatNum(reel.likes)}</span></div>
                  <div className="flex items-center gap-0.5"><MessageCircle size={9} style={{ color: 'var(--muted)' }} /><span className="text-[10px]" style={{ color: 'var(--foreground)' }}>{formatNum(reel.comentarios)}</span></div>
                </div>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--gold)' }}>{reel.ratio_vl?.toFixed(1)}x</span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
