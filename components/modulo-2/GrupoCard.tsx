'use client'

import { Users, TrendingUp } from 'lucide-react'
import { Grupo, formatNum } from './analytics-utils'

export default function GrupoCard({ grupo, onClick }: { grupo: Grupo; onClick: () => void }) {
  const nicho = grupo.nicho

  return (
    <button
      onClick={onClick}
      className="group rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.02]"
      style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}
    >
      {/* Portada: foto de perfil grande */}
      <div className="relative w-full" style={{ aspectRatio: '1/1', backgroundColor: '#1E1E2E' }}>
        {grupo.profilePic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={grupo.profilePic} alt={grupo.nombre} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ color: nicho?.color ?? '#8B8B9E' }}>
            {grupo.nombre[0]?.toUpperCase()}
          </div>
        )}
        {/* Badge de nicho */}
        {nicho && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${nicho.color}dd` }}>
            <span className="text-[10px] font-bold" style={{ color: '#0D0D14' }}>{nicho.nombre}</span>
          </div>
        )}
        {/* Nº de cuentas */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Users size={9} style={{ color: '#fff' }} />
          <span className="text-[10px] font-semibold" style={{ color: '#fff' }}>{grupo.totalCuentas}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold truncate" style={{ color: '#F0F0F5' }}>{grupo.nombre}</p>
        <div className="flex items-center justify-between mt-1.5">
          <div>
            <p className="text-xs font-bold" style={{ color: '#F0F0F5' }}>{formatNum(grupo.totalSeguidores)}</p>
            <p className="text-[10px]" style={{ color: '#8B8B9E' }}>seguidores</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold" style={{ color: '#C9A84C' }}>{grupo.engagementMedio}%</p>
            <p className="text-[10px]" style={{ color: '#8B8B9E' }}>engagement</p>
          </div>
        </div>
      </div>
    </button>
  )
}
