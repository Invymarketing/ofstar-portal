'use client'

import { useState } from 'react'
import { Users, Sparkles } from 'lucide-react'
import GaleriaModelos from './GaleriaModelos'
import ReferenciasPorModelo from './ReferenciasPorModelo'
import { Nicho } from './analytics-utils'

export default function CompetenciaTab({ nichos }: { nichos: Nicho[] }) {
  const [vista, setVista] = useState<'competidores' | 'referencias'>('competidores')

  return (
    <div>
      {/* Sub-toggle */}
      <div className="flex gap-1 p-1 rounded-lg mb-5 w-fit" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)' }}>
        <button onClick={() => setVista('competidores')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all" style={{ backgroundColor: vista === 'competidores' ? 'rgba(201,168,76,0.12)' : 'transparent', color: vista === 'competidores' ? 'var(--gold)' : 'var(--muted)' }}>
          <Users size={13} /> Competidores
        </button>
        <button onClick={() => setVista('referencias')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all" style={{ backgroundColor: vista === 'referencias' ? 'rgba(201,168,76,0.12)' : 'transparent', color: vista === 'referencias' ? 'var(--gold)' : 'var(--muted)' }}>
          <Sparkles size={13} /> Referencias por modelo
        </button>
      </div>

      {vista === 'competidores' ? (
        <GaleriaModelos key="competencia" tipo="competencia" nichos={nichos} />
      ) : (
        <ReferenciasPorModelo />
      )}
    </div>
  )
}
