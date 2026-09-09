'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Loader2, Trash2, Pencil, AtSign } from 'lucide-react'
import ModeloPerfil from './ModeloPerfil'

interface Modelo {
  id: string
  full_name: string
  model_name: string | null
  ig_username: string | null
  content_snare_url: string | null
  notion_url: string | null
  drive_url: string | null
  foto_url: string | null
  telegram_group_id: string | null
  drive_content_folder_id: string | null
  of_trial_link: string | null
  created_at?: string | null
}

export default function ModelosManager({ soloLectura = false }: { soloLectura?: boolean }) {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editModelo, setEditModelo] = useState<Modelo | null>(null)
  const [perfilModelo, setPerfilModelo] = useState<Modelo | null>(null)

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch(soloLectura ? '/api/modelos/fichas-publicas' : '/api/modelos-admin')
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
    return <ModeloPerfil modeloId={perfilModelo.id} nombre={perfilModelo.model_name || perfilModelo.full_name} foto={perfilModelo.foto_url} soloIdentidad={soloLectura} onBack={() => { setPerfilModelo(null); cargar() }} />
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Modelos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{soloLectura ? 'Consulta la identidad de cada modelo para el chatting' : 'Fichas de las modelos de la agencia'}</p>
        </div>
        {!soloLectura && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: 'var(--gold-15)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)' }}>
            <Plus size={15} /> Añadir modelo
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
      )}

      {!loading && modelos.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay modelos registradas aún.</p>
          {!soloLectura && (
            <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-25)', color: 'var(--gold)' }}>Añadir la primera</button>
          )}
        </div>
      )}

      {!loading && modelos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {modelos.map(m => (
            <div key={m.id} onClick={() => setPerfilModelo(m)} className="group rounded-xl p-2.5 cursor-pointer flex items-center gap-3 transition-colors" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>
                {m.foto_url ? (<img src={m.foto_url} alt={m.full_name} className="w-full h-full object-cover" />) : (m.full_name[0]?.toUpperCase())}
              </div>
              <p className="text-sm font-semibold truncate flex-1 min-w-0" style={{ color: 'var(--foreground)' }}>{m.model_name || m.full_name}</p>
              {!soloLectura && (
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditModelo(m)} title="Editar" style={{ color: 'var(--muted)' }} className="p-1 rounded hover:bg-[var(--hover)] transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => eliminar(m.id, m.full_name)} title="Eliminar" style={{ color: 'var(--muted)' }} className="p-1 rounded hover:bg-[var(--hover)] hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && <AddModeloModal onClose={() => setShowModal(false)} onAdded={() => { setShowModal(false); cargar() }} />}
      {editModelo && <EditModeloModal modelo={editModelo} onClose={() => setEditModelo(null)} onSaved={() => { setEditModelo(null); cargar() }} />}
    </div>
  )
}

function AddModeloModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [fullName, setFullName] = useState('')
  const [modelName, setModelName] = useState('')
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
        body: JSON.stringify({ full_name: fullName, model_name: modelName, ig_username: igUsername, content_snare_url: contentSnare, notion_url: notion, drive_url: drive }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Error al crear'); setLoading(false); return }
      onAdded()
    } catch (err) { setError('Error: ' + String(err)); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>Añadir modelo</h2>
          <button onClick={onClose} disabled={loading} style={{ color: 'var(--muted)' }} className="hover:text-foreground disabled:opacity-30"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Nombre *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nombre de la modelo" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Nombre en OnlyFans</label>
            <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Cómo aparece en OF (opcional)" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Instagram</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)' }}>
              <AtSign size={15} style={{ color: 'var(--muted)' }} />
              <input type="text" value={igUsername} onChange={e => setIgUsername(e.target.value)} placeholder="username (opcional)" disabled={loading} className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--foreground)' }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Content Snare (opcional)</label>
            <input type="url" value={contentSnare} onChange={e => setContentSnare(e.target.value)} placeholder="https://..." disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Notion (opcional)</label>
            <input type="url" value={notion} onChange={e => setNotion(e.target.value)} placeholder="https://..." disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Google Drive (opcional)</label>
            <input type="url" value={drive} onChange={e => setDrive(e.target.value)} placeholder="https://..." disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>

          {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--muted)' }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-70" style={{ backgroundColor: 'var(--gold-15)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)' }}>
              {loading && <Loader2 size={14} className="animate-spin" />} {loading ? 'Creando...' : 'Crear modelo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditModeloModal({ modelo, onClose, onSaved }: { modelo: Modelo; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(modelo.full_name ?? '')
  const [modelName, setModelName] = useState(modelo.model_name ?? '')
  const [igUsername, setIgUsername] = useState(modelo.ig_username ?? '')
  const [telegramGroup, setTelegramGroup] = useState(modelo.telegram_group_id ?? '')
  const [driveFolder, setDriveFolder] = useState(modelo.drive_content_folder_id ?? '')
  const [ofLink, setOfLink] = useState(modelo.of_trial_link ?? '')
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
        body: JSON.stringify({ id: modelo.id, full_name: fullName, model_name: modelName, ig_username: igUsername, telegram_group_id: telegramGroup, drive_content_folder_id: driveFolder, of_trial_link: ofLink }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Error al guardar'); setLoading(false); return }
      onSaved()
    } catch (err) { setError('Error: ' + String(err)); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>Editar modelo</h2>
          <button onClick={onClose} disabled={loading} style={{ color: 'var(--muted)' }} className="hover:text-foreground disabled:opacity-30"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Nombre real *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Nombre en OnlyFans</label>
            <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Cómo aparece en OF" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            <p className="text-[11px] mt-1" style={{ color: '#6B6B7E' }}>Este es el nombre que se ve en el portal y con el que se cruzan las ventas de Infloww.</p>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Instagram</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)' }}>
              <AtSign size={15} style={{ color: 'var(--muted)' }} />
              <input type="text" value={igUsername} onChange={e => setIgUsername(e.target.value)} placeholder="username" disabled={loading} className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--foreground)' }} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Grupo de Telegram (chat id)</label>
            <input type="text" value={telegramGroup} onChange={e => setTelegramGroup(e.target.value)} placeholder="-1003861192188" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            <p className="text-[11px] mt-1" style={{ color: '#6B6B7E' }}>El Group_Id_Principal del grupo oficial. Se usa para enviarle mensajes desde Programación de Telegram.</p>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Carpeta de Drive del contenido (link o id)</label>
            <input type="text" value={driveFolder} onChange={e => setDriveFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            <p className="text-[11px] mt-1" style={{ color: '#6B6B7E' }}>Donde la modelo sube su contenido. La ingesta lo detecta y programa solo.</p>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Link de OnlyFans (trial)</label>
            <input type="url" value={ofLink} onChange={e => setOfLink(e.target.value)} placeholder="https://onlyfans.com/…/trial/…" disabled={loading} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            <p className="text-[11px] mt-1" style={{ color: '#6B6B7E' }}>Se agrega al final del CTA de la noche.</p>
          </div>

          {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--muted)' }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-70" style={{ backgroundColor: 'var(--gold-15)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)' }}>
              {loading && <Loader2 size={14} className="animate-spin" />} {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
