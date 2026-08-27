'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Loader2, Trash2, Pencil, AtSign } from 'lucide-react'
import ModeloPerfil from './ModeloPerfil'

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
  foto_url: string | null
  created_at?: string | null
  nichos: Nicho | null
}

export default function ModelosManager({ nichos }: { nichos: Nicho[] }) {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editModelo, setEditModelo] = useState<Modelo | null>(null)
  const [perfilModelo, setPerfilModelo] = useState<Modelo | null>(null)

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

  if (perfilModelo) {
    return <ModeloPerfil modeloId={perfilModelo.id} nombre={perfilModelo.model_name || perfilModelo.full_name} foto={perfilModelo.foto_url} onBack={() => { setPerfilModelo(null); cargar() }} />
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
              <div key={m.id} onClick={() => setPerfilModelo(m)} className="rounded-2xl p-4 cursor-pointer" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold" style={{ backgroundColor: nicho ? `${nicho.color}22` : 'rgba(201,168,76,0.15)', color: nicho?.color ?? '#C9A84C' }}>
                    {m.foto_url ? (<img src={m.foto_url} alt={m.full_name} className="w-full h-full object-cover" />) : (m.full_name[0]?.toUpperCase())}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditModelo(m)} title="Editar nombre" style={{ color: '#8B8B9E' }} className="p-1 rounded hover:bg-white/5 hover:text-white transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => eliminar(m.id, m.full_name)} title="Eliminar" style={{ color: '#8B8B9E' }} className="p-1 rounded hover:bg-white/5 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>{m.model_name || m.full_name}</p>
                  {nicho && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${nicho.color}18`, color: nicho.color, border: `1px solid ${nicho.color}44` }}>{nicho.nombre}</span>}
                </div>
                {m.full_name && m.model_name && m.full_name !== m.model_name && (
                  <p className="text-[11px]" style={{ color: '#6B6B7E' }}>Real: {m.full_name}</p>
                )}
                {m.ig_username && <p className="text-xs" style={{ color: '#8B8B9E' }}>@{m.ig_username}</p>}
                {m.created_at && (
                  <p className="text-[11px] mb-2" style={{ color: '#6B6B7E' }}>
                    Ficha desde {new Date(m.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
                <BadgeContenido modeloId={m.id} />
                <BadgeOnlyFans modeloId={m.id} />
                <div className="flex gap-2 mt-2 items-center" onClick={(e) => e.stopPropagation()}>
                  {m.content_snare_url && <span title="Content Snare (vinculado)" className="p-1 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1E1E2E' }}><img src="/content-snare.svg" alt="Content Snare" width={16} height={16} className="rounded" /></span>}
                  {m.notion_url && <a href={m.notion_url} target="_blank" rel="noopener noreferrer" title="Notion" className="p-1 rounded-lg hover:bg-white/5 flex items-center justify-center"><img src="/notion.svg" alt="Notion" width={16} height={16} /></a>}
                  {m.drive_url && <a href={m.drive_url} target="_blank" rel="noopener noreferrer" title="Google Drive" className="p-1 rounded-lg hover:bg-white/5 flex items-center justify-center"><img src="/drive.svg" alt="Google Drive" width={16} height={16} /></a>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <AddModeloModal nichos={nichos} onClose={() => setShowModal(false)} onAdded={() => { setShowModal(false); cargar() }} />}
      {editModelo && <EditModeloModal nichos={nichos} modelo={editModelo} onClose={() => setEditModelo(null)} onSaved={() => { setEditModelo(null); cargar() }} />}
    </div>
  )
}

function BadgeContenido({ modeloId }: { modeloId: string }) {
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando')
  const [resumen, setResumen] = useState<{ total: number; completas: number; pct: number } | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/modelos/${modeloId}/contenido`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => { if (vivo) { setResumen(data.resumen ?? null); setEstado('ok') } })
      .catch(() => { if (vivo) setEstado('error') })
    return () => { vivo = false }
  }, [modeloId])

  if (estado === 'cargando') {
    return (
      <div className="flex items-center gap-1.5 mb-3">
        <Loader2 size={12} className="animate-spin" style={{ color: '#8B8B9E' }} />
        <span className="text-[11px]" style={{ color: '#8B8B9E' }}>Contando…</span>
      </div>
    )
  }
  if (estado === 'error' || !resumen || resumen.total === 0) {
    return <div className="mb-3"><span className="text-[11px]" style={{ color: '#6B6B7E' }}>Sin tareas esta semana</span></div>
  }

  const { completas, total, pct } = resumen
  const color = pct >= 100 ? '#4ADE80' : pct >= 60 ? '#FBBF24' : '#F87171'
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium" style={{ color }}>{completas}/{total} tareas · {Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1E1E2E' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function BadgeOnlyFans({ modeloId }: { modeloId: string }) {
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando')
  const [datos, setDatos] = useState<{ total: number; entregado: number; porcentaje: number } | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/modelos/${modeloId}/onlyfans`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => { if (vivo) { setDatos(data.encontrado ? data : null); setEstado('ok') } })
      .catch(() => { if (vivo) setEstado('error') })
    return () => { vivo = false }
  }, [modeloId])

  if (estado === 'cargando') {
    return (
      <div className="flex items-center gap-1.5 mb-3">
        <Loader2 size={12} className="animate-spin" style={{ color: '#38BDF8' }} />
        <span className="text-[11px]" style={{ color: '#8B8B9E' }}>OF · contando…</span>
      </div>
    )
  }
  if (estado === 'error' || !datos || datos.total === 0) {
    return <div className="mb-3"><span className="text-[11px]" style={{ color: '#6B6B7E' }}>OF · sin solicitud</span></div>
  }

  const { entregado, total, porcentaje } = datos
  const color = porcentaje >= 100 ? '#4ADE80' : porcentaje >= 60 ? '#FBBF24' : '#38BDF8'
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium" style={{ color }}>OF: {entregado}/{total} · {Math.round(porcentaje)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1E1E2E' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(porcentaje, 100)}%`, backgroundColor: color }} />
      </div>
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
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Nombre en OnlyFans</label>
            <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Cómo aparece en OF (opcional)" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
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

function EditModeloModal({ nichos, modelo, onClose, onSaved }: { nichos: Nicho[]; modelo: Modelo; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(modelo.full_name ?? '')
  const [modelName, setModelName] = useState(modelo.model_name ?? '')
  const [nichoId, setNichoId] = useState(modelo.nicho_id ?? '')
  const [igUsername, setIgUsername] = useState(modelo.ig_username ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/modelos-admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: modelo.id, full_name: fullName, model_name: modelName, nicho_id: nichoId, ig_username: igUsername }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Error al guardar'); setLoading(false); return }
      onSaved()
    } catch (err) { setError('Error: ' + String(err)); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: '#F0F0F5' }}>Editar modelo</h2>
          <button onClick={onClose} disabled={loading} style={{ color: '#8B8B9E' }} className="hover:text-white disabled:opacity-30"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Nombre real *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: '#8B8B9E' }}>Nombre en OnlyFans</label>
            <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Cómo aparece en OF" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }} />
            <p className="text-[11px] mt-1" style={{ color: '#6B6B7E' }}>Este es el nombre que se ve en el portal y con el que se cruzan las ventas de Infloww.</p>
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
              <input type="text" value={igUsername} onChange={e => setIgUsername(e.target.value)} placeholder="username" disabled={loading} className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#F0F0F5' }} />
            </div>
          </div>

          {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#8B8B9E' }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-70" style={{ backgroundColor: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
              {loading && <Loader2 size={14} className="animate-spin" />} {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
