'use client'

import { useState, useEffect } from 'react'
import { X, Check, Loader2, Sparkles } from 'lucide-react'

interface ModeloItem { id: string; full_name: string; model_name: string | null }

export default function ReferenciaModelosModal({ cuentaId, nombreCompetidor, onClose }: {
  cuentaId: string
  nombreCompetidor: string
  onClose: () => void
}) {
  const [modelos, setModelos] = useState<ModeloItem[]>([])
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        // 1) lista de modelos  2) vínculos actuales de esta cuenta
        const [rMod, rVinc] = await Promise.all([
          fetch('/api/modelos-admin').then(r => r.json()),
          fetch(`/api/competencia-modelos?cuenta_id=${cuentaId}`).then(r => r.json()),
        ])
        if (!vivo) return
        setModelos(rMod.modelos ?? [])
        setSeleccion(new Set(rVinc.modelo_ids ?? []))
      } catch {
        if (vivo) { setModelos([]); setSeleccion(new Set()) }
      }
      if (vivo) setCargando(false)
    })()
    return () => { vivo = false }
  }, [cuentaId])

  function toggle(id: string) {
    setSeleccion(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  async function guardar() {
    setGuardando(true)
    try {
      await fetch('/api/competencia-modelos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuenta_id: cuentaId, modelo_ids: Array.from(seleccion) }),
      })
      onClose()
    } catch {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-5" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: '#C9A84C' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>Referencia de…</h3>
          </div>
          <button onClick={onClose} style={{ color: '#8B8B9E' }} className="p-1 rounded hover:bg-white/5"><X size={16} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: '#8B8B9E' }}>Marca a qué modelos sirve <span style={{ color: '#F0F0F5' }}>{nombreCompetidor}</span> como referencia. Puede ser varias.</p>

        {cargando ? (
          <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: '#8B8B9E' }} /></div>
        ) : modelos.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: '#8B8B9E' }}>No hay modelos para elegir.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto mb-4">
            {modelos.map(m => {
              const nombre = m.model_name || m.full_name
              const activa = seleccion.has(m.id)
              return (
                <button key={m.id} onClick={() => toggle(m.id)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all" style={{ backgroundColor: activa ? 'rgba(201,168,76,0.12)' : '#0D0D14', border: activa ? '1px solid rgba(201,168,76,0.35)' : '1px solid #1E1E2E' }}>
                  <span className="text-sm" style={{ color: activa ? '#F0F0F5' : '#8B8B9E' }}>{nombre}</span>
                  {activa && <Check size={15} style={{ color: '#C9A84C' }} />}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#8B8B9E' }}>{seleccion.size} seleccionada{seleccion.size === 1 ? '' : 's'}</span>
          <button onClick={guardar} disabled={guardando || cargando} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50" style={{ backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: '#C9A84C' }}>
            {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
