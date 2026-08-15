'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Filter, Loader2, Users } from 'lucide-react'
import { Cuenta, Nicho, agruparCuentas, formatNum } from './analytics-utils'
import GrupoCard from './GrupoCard'
import GrupoDetalle from './GrupoDetalle'
import AddCuentaModal from './AddCuentaModal'

interface Props { tipo: 'propia' | 'competencia'; nichos: Nicho[] }

export default function GaleriaModelos({ tipo, nichos }: Props) {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [nichoFiltro, setNichoFiltro] = useState('todos')
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cuentas?tipo=${tipo}`)
      const data = await res.json()
      setCuentas(data.cuentas ?? [])
    } catch { setCuentas([]) }
    setLoading(false)
  }, [tipo])

  useEffect(() => { cargar() }, [cargar])

  const grupos = agruparCuentas(cuentas, tipo)
  const gruposFiltrados = nichoFiltro === 'todos' ? grupos : grupos.filter(g => g.nicho?.id === nichoFiltro)

  const totalSeguidores = cuentas.reduce((a, c) => {
    const m = [...(c.metricas_analytics ?? [])].sort((x, y) => y.fecha.localeCompare(x.fecha))[0]
    return a + (m?.seguidores ?? 0)
  }, 0)

  // Vista de detalle de un grupo
  if (grupoAbierto) {
    const grupo = grupos.find(g => g.key === grupoAbierto)
    if (grupo) {
      return (
        <GrupoDetalle
          grupo={grupo}
          tipo={tipo}
          onBack={() => setGrupoAbierto(null)}
          onRefresh={cargar}
        />
      )
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} style={{ color: '#8B8B9E' }} />
          <button onClick={() => setNichoFiltro('todos')} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: nichoFiltro === 'todos' ? 'rgba(201,168,76,0.15)' : '#13131A', color: nichoFiltro === 'todos' ? '#C9A84C' : '#8B8B9E', border: nichoFiltro === 'todos' ? '1px solid rgba(201,168,76,0.25)' : '1px solid #1E1E2E' }}>Todos</button>
          {nichos.map(n => (
            <button key={n.id} onClick={() => setNichoFiltro(n.id)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: nichoFiltro === n.id ? `${n.color}22` : '#13131A', color: nichoFiltro === n.id ? n.color : '#8B8B9E', border: nichoFiltro === n.id ? `1px solid ${n.color}66` : '1px solid #1E1E2E' }}>{n.nombre}</button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
          <Plus size={13} /> Añadir cuenta
        </button>
      </div>

      {/* Resumen */}
      {!loading && cuentas.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
            <p className="text-xs mb-1" style={{ color: '#8B8B9E' }}>{tipo === 'propia' ? 'Modelos' : 'Competidores'}</p>
            <p className="text-lg font-bold" style={{ color: '#F0F0F5' }}>{grupos.length}</p>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
            <p className="text-xs mb-1" style={{ color: '#8B8B9E' }}>Cuentas totales</p>
            <p className="text-lg font-bold" style={{ color: '#F0F0F5' }}>{cuentas.length}</p>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
            <p className="text-xs mb-1" style={{ color: '#8B8B9E' }}>Total seguidores</p>
            <p className="text-lg font-bold" style={{ color: '#F0F0F5' }}>{formatNum(totalSeguidores)}</p>
          </div>
        </div>
      )}

      {loading && <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: '#8B8B9E' }} /></div>}

      {!loading && cuentas.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: '#13131A', border: '1px dashed #1E1E2E' }}>
          <Users size={22} className="mx-auto mb-2" style={{ color: '#8B8B9E' }} />
          <p className="text-sm" style={{ color: '#8B8B9E' }}>No hay {tipo === 'propia' ? 'modelos' : 'competidores'} todavía.</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>Añadir la primera cuenta</button>
        </div>
      )}

      {/* Galería de tarjetas tipo Notion */}
      {!loading && gruposFiltrados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {gruposFiltrados.map(grupo => (
            <GrupoCard key={grupo.key} grupo={grupo} onClick={() => setGrupoAbierto(grupo.key)} />
          ))}
        </div>
      )}

      {showModal && (
        <AddCuentaModal
          tipo={tipo}
          nichos={nichos}
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); cargar() }}
        />
      )}
    </div>
  )
}
