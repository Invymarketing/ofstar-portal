'use client'

import { useState } from 'react'
import { registrarError } from '@/app/(dashboard)/modulo-4/actions'
import { Plus } from 'lucide-react'

interface Chatter { id: string; nombre: string; activo: boolean }
interface Categoria { id: string; nombre: string; grupo_gravedad: string; valor_sancion: number }
interface Modelo { id: string; model_name: string; activa: boolean }

const GRAVEDAD_COLOR: Record<string, string> = {
  grave: '#EF4444', media: '#EAB308', leve: '#22C55E',
}

export default function RegistrarErrorForm({
  chatters, categorias, modelos,
}: { chatters: Chatter[]; categorias: Categoria[]; modelos: Modelo[] }) {
  const [chatterId, setChatterId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [modeloId, setModeloId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [pruebaUrl, setPruebaUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const cat = categorias.find((c) => c.id === categoriaId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(false); setSaving(true)
    try {
      await registrarError({ chatter_id: chatterId, categoria_id: categoriaId, modelo_id: modeloId, descripcion, prueba_url: pruebaUrl })
      setOk(true)
      setCategoriaId(''); setModeloId(''); setDescripcion(''); setPruebaUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5',
  } as const

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
      style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}
    >
      <div>
        <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Chatter</label>
        <select value={chatterId} onChange={(e) => setChatterId(e.target.value)} required
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          <option value="">Elegir…</option>
          {chatters.filter((c) => c.activo).map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Categoría del error</label>
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          <option value="">Elegir…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        {cat && (
          <p className="text-xs mt-1" style={{ color: GRAVEDAD_COLOR[cat.grupo_gravedad] }}>
            Gravedad {cat.grupo_gravedad} · sanción ${cat.valor_sancion} por cada 3 errores
          </p>
        )}
      </div>

      <div>
        <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Modelo (opcional)</label>
        <select value={modeloId} onChange={(e) => setModeloId(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          <option value="">— sin modelo —</option>
          {modelos.filter((m) => m.activa).map((m) => (
            <option key={m.id} value={m.id}>{m.model_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Prueba / captura (URL, opcional)</label>
        <input value={pruebaUrl} onChange={(e) => setPruebaUrl(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="https://…" />
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Descripción</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}
          placeholder="Qué pasó exactamente…" />
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
          <Plus size={15} /> {saving ? 'Guardando…' : 'Registrar error'}
        </button>
        {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
        {ok && <span className="text-xs" style={{ color: '#22C55E' }}>✓ Registrado</span>}
      </div>
    </form>
  )
}
