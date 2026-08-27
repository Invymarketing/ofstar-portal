'use client'

import { useState } from 'react'
import { Users, AlertCircle, Gauge, History, CalendarClock } from 'lucide-react'
import GestionChatters from '@/components/modulo-4/GestionChatters'
import RegistrarErrorForm from '@/components/modulo-4/RegistrarErrorForm'
import PanelCalidad from '@/components/modulo-4/PanelCalidad'
import HistorialErrores from '@/components/modulo-4/HistorialErrores'
import HorariosBoard from '@/components/modulo-4/HorariosBoard'

interface Chatter { id: string; nombre: string; turno: string | null; equipo: number | null; activo: boolean }
interface Categoria { id: string; nombre: string; grupo_gravedad: string; valor_sancion: number }
interface Modelo { id: string; model_name: string; activa: boolean }
interface RankingRow {
  chatter_id: string; nombre: string; errores_totales: number
  sancion_usd: number; disparos: number; escalada: string; puntaje: number
}
interface ErrorRow {
  id: string; chatter_nombre: string; categoria_nombre: string; gravedad: string
  modelo: string | null; fecha_error: string; descripcion: string | null
  prueba_url: string | null; estado: 'abierto' | 'coaching' | 'cerrado'
}

interface Props {
  chatters: Chatter[]
  categorias: Categoria[]
  modelos: Modelo[]
  ranking: RankingRow[]
  errores: ErrorRow[]
}

const TABS = [
  { id: 'chatters', label: 'Chatters', icon: Users },
  { id: 'horarios', label: 'Horarios', icon: CalendarClock },
  { id: 'registrar', label: 'Registrar error', icon: AlertCircle },
  { id: 'sanciones', label: 'Sanciones', icon: Gauge },
  { id: 'historial', label: 'Historial', icon: History },
] as const

export default function Modulo4Tabs({ chatters, categorias, modelos, ranking, errores }: Props) {
  const [tab, setTab] = useState<string>('chatters')
  const activas = chatters.filter((c) => c.activo).length

  return (
    <div>
      {/* Barra de pestañas */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b" style={{ borderColor: '#1E1E2E' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors"
              style={{ color: active ? '#C9A84C' : '#6B6B80', borderColor: active ? '#C9A84C' : 'transparent' }}>
              <Icon size={15} />
              {t.label}
              {t.id === 'chatters' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#1E1E2E', color: '#6B6B80' }}>{activas}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Contenido de la pestaña activa */}
      {tab === 'chatters' && <GestionChatters chatters={chatters} />}
      {tab === 'horarios' && <HorariosBoard chatters={chatters} />}
      {tab === 'registrar' && (
        <RegistrarErrorForm chatters={chatters} categorias={categorias} modelos={modelos} />
      )}
      {tab === 'sanciones' && <PanelCalidad ranking={ranking} />}
      {tab === 'historial' && <HistorialErrores errores={errores} />}
    </div>
  )
}
