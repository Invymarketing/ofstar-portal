'use client'

import { useState } from 'react'
import { Users, Sparkles } from 'lucide-react'
import GaleriaModelos from './GaleriaModelos'
import ReferenciasPorNicho from './ReferenciasPorNicho'
import { Nicho } from './analytics-utils'

export default function CompetenciaTab({ nichos }: { nichos: Nicho[] }) {
  const [vista, setVista] = useState<'competidores' | 'referencias'>('competidores')

  return (
    <div>
      {/* Sub-toggle */}
      <div className="flex gap-1 p-1 rounded-lg mb-5 w-fit" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E' }}>
        <button onClick={() => setVista('competidores')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all" style={{ backgroundColor: vista === 'competidores' ? 'rgba(201,168,76,0.12)' : 'transparent', color: vista === 'competidores' ? '#C9A84C' : '#8B8B9E' }}>
          <Users size={13} /> Competidores
        </button>
        <button onClick={() => setVista('referencias')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all" style={{ backgroundColor: vista === 'referencias' ? 'rgba(201,168,76,0.12)' : 'transparent', color: vista === 'referencias' ? '#C9A84C' : '#8B8B9E' }}>
          <Sparkles size={13} /> Referencias por nicho
        </button>
      </div>

      {vista === 'competidores' ? (
        <GaleriaModelos key="competencia" tipo="competencia" nichos={nichos} />
      ) : (
        <ReferenciasPorNicho />
      )}
    </div>
  )
}
