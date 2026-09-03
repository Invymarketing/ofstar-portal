'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Users } from 'lucide-react'
import GaleriaModelos from './GaleriaModelos'
import CompetenciaTab from './CompetenciaTab'
import { Nicho } from './analytics-utils'

interface Props { userId: string; userRole: string; nichos: Nicho[] }

export default function AnalyticsDashboard({ userId, userRole, nichos }: Props) {
  const [activeTab, setActiveTab] = useState<'propia' | 'competencia'>('propia')

  const tabStyle = (active: boolean) => ({
    backgroundColor: active ? 'var(--gold-15)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--muted)',
    border: active ? '1px solid var(--gold-25)' : '1px solid transparent',
  })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}>
            <BarChart3 size={18} style={{ color: 'var(--gold)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Analytics & Referencias</h1>
        </div>
        <p className="text-sm ml-12" style={{ color: 'var(--muted)' }}>Métricas de cuentas propias y análisis de competencia por nicho</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <button onClick={() => setActiveTab('propia')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={tabStyle(activeTab === 'propia')}>
          <TrendingUp size={15} /> Cuentas propias
        </button>
        <button onClick={() => setActiveTab('competencia')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={tabStyle(activeTab === 'competencia')}>
          <Users size={15} /> Competencia
        </button>
      </div>

      {activeTab === 'propia' && <GaleriaModelos key="propia" tipo="propia" nichos={nichos} />}
      {activeTab === 'competencia' && <CompetenciaTab nichos={nichos} />}
    </div>
  )
}
