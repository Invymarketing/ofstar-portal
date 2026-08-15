'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Loader2, Trash2, FileText, StickyNote, FolderOpen, AtSign } from 'lucide-react'

interface Nicho { id: string; nombre: string; color: string }
interface Modelo {
  id: string
  full_name: string
  model_name: string | null
  nicho_id: string | null
  ig_username: string | null
  content_snare_url: string | null
  notion_url: string | null
  drive_url: string | null
  nichos: Nicho | null
}

export default function ModelosManager({ nichos }: { nichos: Nicho[] }) {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/modelos-admin')
      const data = await res.json()
      setModelos(data.modelos ?? [])
    } catch { setModelos([]) }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la ficha de ${nombre}?`)) return
    await fetch(`/api/modelos-admin?id=${id}`, { method: 'DELETE' })
    await cargar()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Modelos</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8B8B9E' }}>Fichas de las modelos de la agencia</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
          <Plus size={15} /> Añadir modelo
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: '#8B8B9E' }} /></div>
      )}

      {!loading && modelos.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: '#13131A', border: '1px dashed #1E1E2E' }}>
          <p className="text-sm" style={{ color: '#8B8B9E' }}>No hay modelos registradas aún.</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>Añadir la primera</button>
        </div>
      )}

      {!loading && modelos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modelos.map(m => {
            const nicho = m.nichos
            return (
              <div key={m.id} className="rounded-2xl p-4" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: nicho ? `${nicho.color}22` : 'rgba(201,168,76,0.15)', color: nicho?.color ?? '#C9A84C' }}>
                    {m.full_name[0]?.toUpperCase()}
                  </div>
                  <button onClick={() => eliminar(m.id, m.full_name)} style={{ color: '#8B8B9E' }} className="p-1 rounded hover:bg-white/5 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>{m.model_name || m.full_name}</p>
                  {nicho && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${nicho.color}18`, color: nicho.color, border: `1px solid ${nicho.color}44` }}>{nicho.nombre}</span>}
                </div>
                {m.ig_username && <p className="text-xs mb-3" style={{ color: '#8B8B9E' }}>@{m.ig_username}</p>}
                <div className="flex gap-2 mt-2">
                  {m.content_snare_url && <a href={m.content_snare_url} target="_blank" rel="noopener noreferrer" title="Content Snare" style={{ color: '#8B8B9E' }} className="p-1.5 rounded-lg hover:bg-white/5"><FileText size={13} /></a>}
                  {m.notion_url && <a href={m.notion_url} target="_blank" rel="noopener noreferrer" title="Notion" style={{ color: '#8B8B9E' }} className="p-1.5 rounded-lg hover:bg-white/5"><StickyNote size={13} /></a>}
                  {m.drive_url && <a href={m.drive_url} target="_blank" rel="noopener noreferrer" title="Drive" style={{ color: '#8B8B9E' }} className="p-1.5 rounded-lg hover:bg-white/5"><FolderOpen size={13} /></a>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <AddModeloModal nichos={nichos} onClose={() => setShowModal(false)} onAdded={() => { setShowModal(false); cargar() }} />}
    </div>
  )
}

function AddModeloModal({ nichos, onClose, onAdded }: { nichos: Nicho[]; onClose: () => void; onAdded: () => void }) {
  const [fullName, setFullName] = useState('')
  const [modelName, setModelName] = useState('')
  const [nichoId, setNichoId] = useState('')
  const [igUsername, setIgUsername] = useState('')
  const [contentSnare, setContentSnare] = useState('')
  const [notion, setNotion] = useState('')
  const [drive, setDrive] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName) { setError('El nombre es obligatorio'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/modelos-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, model_name: modelName, nicho_id: nichoId, ig_username: igUsername, content_snare_url: contentSnare, notion_url: notion, drive_url: drive }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Error al crear'); setLoading(false); return }
      onAdded()
    } catch (err) { setError('Error: ' + String(err)); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: '#F0F0F5' }}>Añadir modelo</h2>
          <button onClick={onClose} disabled={loading} style={{ color: '#8B8B9E' }} className="hover:text-white disabled:opacity-30"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Nombre *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre de la modelo" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Nombre artístico</label>
            <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Cómo aparece en el portal (opcional)" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Nicho</label>
            <div className="flex flex-wrap gap-2">
              {nichos.map(n => (
                <button key={n.id} type="button" onClick={() => setNichoId(nichoId === n.id ? '' : n.id)} disabled={loading} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50" style={{ backgroundColor: nichoId === n.id ? `${n.color}22` : '#0D0D14', color: nichoId === n.id ? n.color : '#8B8B9E', border: nichoId === n.id ? `1px solid ${n.color}66` : '1px solid #1E1E2E' }}>{n.nombre}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Instagram</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E' }}>
              <AtSign size={15} style={{ color: '#8B8B9E' }} />
              <input type="text" value={igUsername} onChange={e => setIgUsername(e.target.value)} placeholder="username (opcional)" disabled={loading} className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#F0F0F5' }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Content Snare (opcional)</label>
            <input type="url" value={contentSnare} onChange={e => setContentSnare(e.target.value)} placeholder="https://..." disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Notion (opcional)</label>
            <input type="url" value={notion} onChange={e => setNotion(e.target.value)} placeholder="https://..." disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Google Drive (opcional)</label>
            <input type="url" value={drive} onChange={e => setDrive(e.target.value)} placeholder="https://..." disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
          </div>

          {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#8B8B9E' }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-70" style={{ backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
              {loading && <Loader2 size={14} className="animate-spin" />} {loading ? 'Creando...' : 'Crear modelo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
