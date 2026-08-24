'use client'

import { useState } from 'react'
import { Wallet, Fish, Users, PlusCircle } from 'lucide-react'
import VentasPanel from '@/components/modulo-3/VentasPanel'
import BallenasPanel from '@/components/modulo-3/BallenasPanel'
import FansPanel from '@/components/modulo-3/FansPanel'
import RegistrarVentaForm from '@/components/modulo-3/RegistrarVentaForm'

export interface Modelo { id: string; model_name: string; activa: boolean }
export interface Venta {
  id: string; fecha: string; fan_name: string | null; fan_id: string | null
  monto_bruto: number; comision: number; venta_neto: number
  tipo: string | null; estado: string; origen: string
  modelo: string | null; creator_id_infloww: string | null
}
export interface Fan {
  fan_id: string; fan_name: string | null; modelo: string | null
  num_compras: number; ltv: number; ticket_promedio: number
  dias_sin_comprar: number | null; tier: string; estado_fan: string
  en_potencia: string; ballena_enfriandose: string
}
export interface Kpis { bruto: number; comision: number; neto: number; ventas: number }
export interface ModeloCaja { modelo: string; bruto: number; comision: number; neto: number; ventas: number }

interface Props {
  modelos: Modelo[]
  ventas: Venta[]
  fans: Fan[]
  kpis: Kpis
  porModelo: ModeloCaja[]
  quincena: string
}

const TABS = [
  { id: 'ventas', label: 'Ventas', icon: Wallet },
  { id: 'ballenas', label: 'Ballenas', icon: Fish },
  { id: 'fans', label: 'Fans', icon: Users },
  { id: 'registrar', label: 'Registrar venta', icon: PlusCircle },
] as const

export default function Modulo3Tabs({ modelos, ventas, fans, kpis, porModelo, quincena }: Props) {
  const [tab, setTab] = useState<string>('ventas')
  const ballenas = fans.filter((f) => f.tier === '🐋 Ballena')

  return (
    <div>
      <div className="flex gap-1 mb-6 overflow-x-auto border-b" style={{ borderColor: '#1E1E2E' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          const badge =
            t.id === 'ballenas' ? ballenas.length : t.id === 'fans' ? fans.length : null
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors"
              style={{ color: active ? '#C9A84C' : '#6B6B80', borderColor: active ? '#C9A84C' : 'transparent' }}>
              <Icon size={15} />
              {t.label}
              {badge !== null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#1E1E2E', color: '#6B6B80' }}>{badge}</span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'ventas' && (
        <VentasPanel ventas={ventas} kpis={kpis} porModelo={porModelo} quincena={quincena} />
      )}
      {tab === 'ballenas' && <BallenasPanel fans={fans} />}
      {tab === 'fans' && <FansPanel fans={fans} />}
      {tab === 'registrar' && <RegistrarVentaForm modelos={modelos} />}
    </div>
  )
}
