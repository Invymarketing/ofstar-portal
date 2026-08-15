'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Users } from 'lucide-react'
import GaleriaModelos from './GaleriaModelos'
import { Nicho } from './analytics-utils'

interface Props { userId: string; userRole: string; nichos: Nicho[] }

export default function AnalyticsDashboard({ userId, userRole, nichos }: Props) {
  const [activeTab, setActiveTab] = useState<'propia' | 'competencia'>('propia')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <BarChart3 size={18} style={{ color: '#C9A84C' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Analytics & Referencias</h1>
        </div>
        <p className="text-sm ml-12" style={{ color: '#8B8B9E' }}>Métricas de cuentas propias y análisis de competencia por nicho</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
        <button onClick={() => setActiveTab('propia')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: activeTab === 'propia' ? 'rgba(201,168,76,0.15)' : 'transparent', color: activeTab === 'propia' ? '#C9A84C' : '#8B8B9E', border: activeTab === 'propia' ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent' }}>
          <TrendingUp size={15} /> Cuentas propias
        </button>
        <button onClick={() => setActiveTab('competencia')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: activeTab === 'competencia' ? 'rgba(201,168,76,0.15)' : 'transparent', color: activeTab === 'competencia' ? '#C9A84C' : '#8B8B9E', border: activeTab === 'competencia' ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent' }}>
          <Users size={15} /> Competencia
        </button>
      </div>

      <GaleriaModelos key={activeTab} tipo={activeTab} nichos={nichos} />
    </div>
  )
}
