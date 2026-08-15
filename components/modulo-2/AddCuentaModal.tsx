'use client'

import { useState, useEffect } from 'react'
import { X, AtSign, Loader2, Star } from 'lucide-react'
import { Nicho } from './analytics-utils'

interface Modelo { id: string; nombre: string }
interface Props {
  tipo: 'propia' | 'competencia'
  nichos: Nicho[]
  onClose: () => void
  onAdded: () => void
}

export default function AddCuentaModal({ tipo, nichos, onClose, onAdded }: Props) {
  const [username, setUsername] = useState('')
  const [nichoId, setNichoId] = useState('')
  const [modeloId, setModeloId] = useState('')
  const [grupoComp, setGrupoComp] = useState('')
  const [esPrincipal, setEsPrincipal] = useState(false)
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')

  const [modelos, setModelos] = useState<Modelo[]>([])
  const [loadingModelos, setLoadingModelos] = useState(tipo === 'propia')

  useEffect(() => {
    if (tipo !== 'propia') return
    fetch('/api/modelos').then(r => r.json()).then(d => setModelos(d.modelos ?? [])).catch(() => setModelos([])).finally(() => setLoadingModelos(false))
  }, [tipo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username) { setError('El username es obligatorio'); return }
    if (tipo === 'propia' && !modeloId) { setError('Selecciona a qué modelo pertenece'); return }
    if (tipo === 'competencia' && !grupoComp) { setError('Escribe el nombre del competidor'); return }
    setLoading(true); setError('')

    try {
      setStatusMsg('Guardando...')
      const res = await fetch('/api/cuentas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo, ig_username: username, nicho_id: nichoId,
          modelo_id: tipo === 'propia' ? modeloId : null,
          grupo_competencia: tipo === 'competencia' ? grupoComp : null,
          es_principal: esPrincipal, notas,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'cuenta_duplicada') setError('Esta cuenta ya está registrada')
        else setError('Error: ' + (data.error ?? 'desconocido'))
        setLoading(false); setStatusMsg(''); return
      }

      setStatusMsg('Trayendo datos de Instagram...')
      const syncRes = await fetch('/api/hikerapi/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cuenta_id: data.cuenta.id }) })
      if (!syncRes.ok) {
        const sd = await syncRes.json()
        setStatusMsg(''); setError('Cuenta creada, datos pendientes: ' + (sd.message ?? sd.error ?? ''))
        setLoading(false); setTimeout(onAdded, 1500); return
      }
      setStatusMsg('¡Listo!'); onAdded()
    } catch (err) {
      setError('Error: ' + String(err)); setLoading(false); setStatusMsg('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#F0F0F5' }}>{tipo === 'propia' ? 'Añadir cuenta a modelo' : 'Añadir cuenta de competencia'}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#8B8B9E' }}>{tipo === 'propia' ? 'Una cuenta de IG de una de tus modelos' : 'Cuenta de un competidor a monitorizar'}</p>
          </div>
          <button onClick={onClose} disabled={loading} style={{ color: '#8B8B9E' }} className="hover:text-white disabled:opacity-30"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Username de Instagram *</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E' }}>
              <AtSign size={15} style={{ color: '#8B8B9E' }} />
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" disabled={loading} className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#F0F0F5' }} />
            </div>
          </div>

          {/* Modelo (propias) o Grupo (competencia) */}
          {tipo === 'propia' ? (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>¿De qué modelo es? *</label>
              {loadingModelos ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E' }}>
                  <Loader2 size={13} className="animate-spin" style={{ color: '#8B8B9E' }} /><span className="text-xs" style={{ color: '#8B8B9E' }}>Cargando...</span>
                </div>
              ) : modelos.length === 0 ? (
                <p className="text-xs px-1" style={{ color: '#8B8B9E' }}>No hay modelos. Añádelas en el módulo &quot;Modelos&quot;.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {modelos.map(m => (
                    <button key={m.id} type="button" onClick={() => setModeloId(m.id)} disabled={loading} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: modeloId === m.id ? 'rgba(201,168,76,0.15)' : '#0D0D14', color: modeloId === m.id ? '#C9A84C' : '#8B8B9E', border: modeloId === m.id ? '1px solid rgba(201,168,76,0.25)' : '1px solid #1E1E2E' }}>{m.nombre}</button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Nombre del competidor *</label>
              <input type="text" value={grupoComp} onChange={e => setGrupoComp(e.target.value)} placeholder="Ej: Agencia rival, nombre de la modelo..." disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
              <p className="text-[10px] mt-1" style={{ color: 'rgba(139,139,158,0.6)' }}>Las cuentas con el mismo nombre se agrupan juntas</p>
            </div>
          )}

          {/* Nicho */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Nicho</label>
            <div className="flex flex-wrap gap-2">
              {nichos.map(n => (
                <button key={n.id} type="button" onClick={() => setNichoId(nichoId === n.id ? '' : n.id)} disabled={loading} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: nichoId === n.id ? `${n.color}22` : '#0D0D14', color: nichoId === n.id ? n.color : '#8B8B9E', border: nichoId === n.id ? `1px solid ${n.color}66` : '1px solid #1E1E2E' }}>{n.nombre}</button>
              ))}
            </div>
          </div>

          {/* Marcar como principal */}
          <button type="button" onClick={() => setEsPrincipal(!esPrincipal)} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs w-full transition-all" style={{ backgroundColor: esPrincipal ? 'rgba(201,168,76,0.1)' : '#0D0D14', border: esPrincipal ? '1px solid rgba(201,168,76,0.25)' : '1px solid #1E1E2E', color: esPrincipal ? '#C9A84C' : '#8B8B9E' }}>
            <Star size={13} fill={esPrincipal ? '#C9A84C' : 'none'} />
            Cuenta principal (su foto será la de la carpeta)
          </button>

          {/* Notas competencia */}
          {tipo === 'competencia' && (
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Notas (opcional)</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Por qué es relevante..." rows={2} disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-xs outline-none resize-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
            </div>
          )}

          {statusMsg && <p className="text-xs" style={{ color: '#C9A84C' }}>{statusMsg}</p>}
          {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#8B8B9E' }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-70" style={{ backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
              {loading && <Loader2 size={14} className="animate-spin" />}{loading ? 'Procesando...' : 'Añadir y sincronizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
