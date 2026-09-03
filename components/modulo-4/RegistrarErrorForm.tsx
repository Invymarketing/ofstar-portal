'use client'

import { useState, useRef } from 'react'
import { registrarError } from '@/app/(dashboard)/modulo-4/actions'
import { createClient } from '@/lib/supabase/client'
import { Plus, ImagePlus, X } from 'lucide-react'

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
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const cat = categorias.find((c) => c.id === categoriaId)

  function elegirArchivo(f: File | null) {
    setError(null)
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Solo imágenes'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function quitarImagen() {
    setFile(null); setPreview('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(false); setSaving(true)
    try {
      let prueba_url = ''
      if (file) {
        const supabase = createClient()
        const ext = file.name.split('.').pop() || 'png'
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('pruebas').upload(path, file, { upsert: false })
        if (upErr) throw new Error('No se pudo subir la imagen: ' + upErr.message)
        prueba_url = supabase.storage.from('pruebas').getPublicUrl(path).data.publicUrl
      }
      await registrarError({ chatter_id: chatterId, categoria_id: categoriaId, modelo_id: modeloId, descripcion, prueba_url })
      setOk(true)
      setCategoriaId(''); setModeloId(''); setDescripcion(''); quitarImagen()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  return (
    <form onSubmit={submit}
      className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Chatter</label>
        <select value={chatterId} onChange={(e) => setChatterId(e.target.value)} required
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          <option value="">Elegir…</option>
          {chatters.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Categoría del error</label>
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          <option value="">Elegir…</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        {cat && (
          <p className="text-xs mt-1" style={{ color: GRAVEDAD_COLOR[cat.grupo_gravedad] }}>
            Gravedad {cat.grupo_gravedad} · sanción ${cat.valor_sancion} por cada 3 errores
          </p>
        )}
      </div>

      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Modelo (opcional)</label>
        <select value={modeloId} onChange={(e) => setModeloId(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          <option value="">— sin modelo —</option>
          {modelos.filter((m) => m.activa).map((m) => <option key={m.id} value={m.id}>{m.model_name}</option>)}
        </select>
      </div>

      {/* Zona de imagen (arrastrar o clic) */}
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Prueba / captura (opcional)</label>
        {!preview ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); elegirArchivo(e.dataTransfer.files?.[0] ?? null) }}
            className="flex flex-col items-center justify-center gap-1 rounded-lg py-4 cursor-pointer text-center"
            style={{ backgroundColor: '#0D0D14', border: `1px dashed ${dragOver ? 'var(--gold)' : 'var(--border)'}`, color: 'var(--muted)' }}>
            <ImagePlus size={18} />
            <span className="text-xs">Arrastra una imagen aquí o haz clic</span>
          </div>
        ) : (
          <div className="relative rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="prueba" className="w-full max-h-32 object-cover" />
            <button type="button" onClick={quitarImagen}
              className="absolute top-1 right-1 p-1 rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }} title="Quitar">
              <X size={14} />
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)} />
      </div>

      <div className="sm:col-span-2">
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Descripción</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
          className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}
          placeholder="Qué pasó exactamente…" />
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
          <Plus size={15} /> {saving ? 'Guardando…' : 'Registrar error'}
        </button>
        {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
        {ok && <span className="text-xs" style={{ color: '#22C55E' }}>✓ Registrado</span>}
      </div>
    </form>
  )
}
