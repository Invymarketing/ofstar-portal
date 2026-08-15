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

interface Props {
  reels: Reel[]
  dias: number  // 7, 14, 30
}

function formatNum(n: number): string {
  if (n == null) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

// Score combinado: views + engagement ponderado
function calcScore(r: Reel): number {
  // engagement pesa más relativo a views (likes y comentarios valen x50 y x100)
  return r.views + r.likes * 50 + r.comentarios * 100
}

export default function ReelsGrid({ reels, dias }: Props) {
  const { filtrados, media, ganadores } = useMemo(() => {
    const limite = new Date()
    limite.setDate(limite.getDate() - dias)

    const filtrados = reels.filter(r => {
      if (!r.fecha_publicacion) return false
      return new Date(r.fecha_publicacion) >= limite
    })

    if (filtrados.length === 0) return { filtrados: [], media: 0, ganadores: new Set<string>() }

    const scores = filtrados.map(calcScore)
    const media = scores.reduce((a, b) => a + b, 0) / scores.length
    const ganadores = new Set(filtrados.filter(r => calcScore(r) > media).map(r => r.url))

    // Ordenar por score descendente
    filtrados.sort((a, b) => calcScore(b) - calcScore(a))

    return { filtrados, media, ganadores }
  }, [reels, dias])

  if (filtrados.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl" style={{ backgroundColor: '#0D0D14', border: '1px dashed #1E1E2E' }}>
        <Film size={20} className="mx-auto mb-2" style={{ color: '#6B6B80' }} />
        <p className="text-xs" style={{ color: '#6B6B80' }}>
          No hay reels en los últimos {dias} días.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Info de la media */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: '#6B6B80' }}>
          {filtrados.length} reels · {ganadores.size} ganador{ganadores.size !== 1 ? 'es' : ''} sobre la media
        </p>
      </div>

      {/* Cuadrícula de portadas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtrados.map((reel, i) => {
          const esGanador = ganadores.has(reel.url)
          return (
            <a
              key={i}
              href={reel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-xl overflow-hidden transition-all"
              style={{ border: esGanador ? '1.5px solid #C9A84C' : '1px solid #1E1E2E', backgroundColor: '#0D0D14' }}
            >
              {/* Badge ganador */}
              {esGanador && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(201,168,76,0.9)' }}>
                  <Trophy size={9} style={{ color: '#0D0D14' }} />
                  <span className="text-[9px] font-bold" style={{ color: '#0D0D14' }}>GANADOR</span>
                </div>
              )}

              {/* Portada (aspect ratio 9:16 de reel) */}
              <div className="relative w-full" style={{ aspectRatio: '9/16', backgroundColor: '#1E1E2E' }}>
                {reel.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reel.thumbnail_url} alt="reel" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film size={24} style={{ color: '#6B6B80' }} />
                  </div>
                )}
                {/* Overlay hover con icono de enlace */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <ExternalLink size={20} style={{ color: '#fff' }} />
                </div>
                {/* Views sobre la portada */}
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                  <Eye size={10} style={{ color: '#fff' }} />
                  <span className="text-[10px] font-semibold" style={{ color: '#fff' }}>{formatNum(reel.views)}</span>
                </div>
              </div>

              {/* Métricas debajo */}
              <div className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <Heart size={9} style={{ color: '#6B6B80' }} />
                    <span className="text-[10px]" style={{ color: '#F0F0F5' }}>{formatNum(reel.likes)}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <MessageCircle size={9} style={{ color: '#6B6B80' }} />
                    <span className="text-[10px]" style={{ color: '#F0F0F5' }}>{formatNum(reel.comentarios)}</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold" style={{ color: '#C9A84C' }}>{reel.ratio_vl?.toFixed(1)}x</span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
