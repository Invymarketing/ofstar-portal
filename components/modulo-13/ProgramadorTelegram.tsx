'use client'

import { useMemo, useRef, useState } from 'react'
import { crearMensaje, eliminarMensaje } from '@/app/(dashboard)/modulo-13/actions'
import { createClient } from '@/lib/supabase/client'
import {
  Send, Trash2, Clock, CheckCircle2, XCircle, RefreshCw, Plus, X,
  MessageSquare, Image as ImageIcon, Video, ImagePlus,
} from 'lucide-react'

interface Modelo { id: string; model_name: string; tiene_grupo: boolean }
interface Mensaje {
  id: string; modelo_id: string | null; modelo: string | null; tipo: string
  texto: string | null; archivo_url: string | null; fecha_programada: string
  enviado: boolean; enviado_at: string | null; error: string | null
}

const TIPOS = [
  { key: 'texto', label: 'Texto', icon: MessageSquare },
  { key: 'foto', label: 'Foto', icon: ImageIcon },
  { key: 'video', label: 'Video', icon: Video },
] as const

function fechaLocalDefault() {
  const d = new Date(Date.now() + 5 * 60 * 1000)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

const ESTADO = {
  enviado: { label: 'Enviado', color: '#22C55E', Icon: CheckCircle2 },
  error: { label: 'Error', color: '#EF4444', Icon: XCircle },
  pend: { label: 'Pendiente', color: '#EAB308', Icon: Clock },
}

export default function ProgramadorTelegram({ modelos, mensajes }: { modelos: Modelo[]; mensajes: Mensaje[] }) {
  const [sel, setSel] = useState<string>(modelos[0]?.id ?? '')
  const [showForm, setShowForm] = useState(false)
  const [tipo, setTipo] = useState<'texto' | 'foto' | 'video'>('texto')
  const [texto, setTexto] = useState('')
  const [archivoUrl, setArchivoUrl] = useState('')
  const [preview, setPreview] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fecha, setFecha] = useState(fechaLocalDefault())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const
  const modeloSel = modelos.find((m) => m.id === sel)

  const pendientesPorModelo = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of mensajes) if (!x.enviado && x.modelo_id) m.set(x.modelo_id, (m.get(x.modelo_id) ?? 0) + 1)
    return m
  }, [mensajes])

  // Mensajes del modelo seleccionado, agrupados por día
  const agenda = useMemo(() => {
    const delModelo = mensajes
      .filter((x) => x.modelo_id === sel)
      .sort((a, b) => +new Date(a.fecha_programada) - +new Date(b.fecha_programada))
    const grupos: { dia: string; label: string; items: Mensaje[] }[] = []
    const idx = new Map<string, number>()
    for (const x of delModelo) {
      const d = new Date(x.fecha_programada)
      const dia = d.toISOString().slice(0, 10)
      if (!idx.has(dia)) {
        idx.set(dia, grupos.length)
        grupos.push({ dia, label: d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' }), items: [] })
      }
      grupos[idx.get(dia)!].items.push(x)
    }
    return grupos
  }, [mensajes, sel])

  async function subirArchivo(file: File | null) {
    setError(null)
    if (!file) return
    const esFoto = file.type.startsWith('image/')
    const esVideo = file.type.startsWith('video/')
    if (!esFoto && !esVideo) { setError('Solo imágenes o videos'); return }
    setTipo(esVideo ? 'video' : 'foto')
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || (esVideo ? 'mp4' : 'jpg')
      const path = `${sel || 'sin-modelo'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('telegram').upload(path, file, { upsert: false })
      if (upErr) throw new Error('No se pudo subir: ' + upErr.message)
      const url = supabase.storage.from('telegram').getPublicUrl(path).data.publicUrl
      setArchivoUrl(url)
      setPreview(esFoto ? url : '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  function limpiarForm() {
    setTexto(''); setArchivoUrl(''); setPreview(''); setTipo('texto'); setFecha(fechaLocalDefault())
    if (inputRef.current) inputRef.current.value = ''
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSaving(true)
    try {
      await crearMensaje({
        modelo_id: sel, tipo, texto,
        archivo_url: archivoUrl,
        fecha_programada: new Date(fecha).toISOString(),
      })
      limpiarForm(); setShowForm(false)
      setTimeout(() => window.location.reload(), 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function enviarAhora() {
    setSyncing(true); setMsg(null)
    try {
      const res = await fetch('/api/cron/send-telegram', { credentials: 'include' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error')
      setMsg(`✓ ${j.enviados} enviados`)
      setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setSyncing(false)
    }
  }

  function estadoDe(x: Mensaje) {
    return x.enviado ? ESTADO.enviado : x.error ? ESTADO.error : ESTADO.pend
  }

  return (
    <div>
      {/* Selector de modelo */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {modelos.map((m) => {
          const active = m.id === sel
          const pend = pendientesPorModelo.get(m.id) ?? 0
          return (
            <button key={m.id} onClick={() => setSel(m.id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: active ? 'rgba(201,168,76,0.15)' : '#13131A',
                border: `1px solid ${active ? 'rgba(201,168,76,0.35)' : '#1E1E2E'}`,
                color: active ? '#C9A84C' : '#8B8B9E',
              }}>
              {m.model_name}
              {pend > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: active ? 'rgba(201,168,76,0.25)' : '#1E1E2E', color: active ? '#C9A84C' : '#6B6B80' }}>{pend}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#F0F0F5' }}>{modeloSel?.model_name ?? 'Sin modelo'}</h2>
          {modeloSel && !modeloSel.tiene_grupo && (
            <p className="text-xs" style={{ color: '#EF4444' }}>⚠ Sin grupo de Telegram — configúralo en Modelos (✏️).</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs" style={{ color: '#C9A84C' }}>{msg}</span>}
          <button onClick={enviarAhora} disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#1E1E2E', color: '#F0F0F5' }}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> Enviar pendientes
          </button>
          <button onClick={() => { setShowForm(!showForm); limpiarForm() }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
            {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Cerrar' : 'Nuevo'}
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={crear} className="rounded-2xl border p-5 space-y-4 mb-6" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E' }}>
            {TIPOS.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.key} type="button" onClick={() => setTipo(t.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: tipo === t.key ? 'rgba(201,168,76,0.15)' : 'transparent', color: tipo === t.key ? '#C9A84C' : '#8B8B9E' }}>
                  <Icon size={14} /> {t.label}
                </button>
              )
            })}
          </div>

          {(tipo === 'foto' || tipo === 'video') && (
            <div>
              {!preview && !archivoUrl ? (
                <div
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); subirArchivo(e.dataTransfer.files?.[0] ?? null) }}
                  className="flex flex-col items-center justify-center gap-1 rounded-lg py-6 cursor-pointer text-center"
                  style={{ backgroundColor: '#0D0D14', border: `1px dashed ${dragOver ? '#C9A84C' : '#1E1E2E'}`, color: '#6B6B80' }}>
                  <ImagePlus size={20} />
                  <span className="text-xs">{uploading ? 'Subiendo…' : `Arrastra ${tipo === 'video' ? 'un video' : 'una imagen'} o haz clic`}</span>
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden inline-block" style={{ border: '1px solid #1E1E2E' }}>
                  {preview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={preview} alt="preview" className="max-h-40 object-cover" />
                    : <div className="px-4 py-3 text-xs" style={{ color: '#22C55E' }}>✓ Archivo subido</div>}
                  <button type="button" onClick={() => { setArchivoUrl(''); setPreview(''); if (inputRef.current) inputRef.current.value = '' }}
                    className="absolute top-1 right-1 p-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                    <X size={13} />
                  </button>
                </div>
              )}
              <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden"
                onChange={(e) => subirArchivo(e.target.files?.[0] ?? null)} />
            </div>
          )}

          <div>
            <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>{tipo === 'texto' ? 'Mensaje' : 'Caption (opcional)'}</label>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}
              placeholder={tipo === 'texto' ? 'Buenos días… ☀️' : 'Texto que acompaña…'} />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Fecha y hora</label>
              <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required
                className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
            </div>
            <button type="submit" disabled={saving || uploading}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 self-end"
              style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
              <Send size={15} /> {saving ? 'Programando…' : 'Programar'}
            </button>
            {error && <span className="text-xs self-end" style={{ color: '#EF4444' }}>{error}</span>}
          </div>
        </form>
      )}

      {/* Agenda del modelo */}
      {agenda.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
          <p className="text-sm" style={{ color: '#6B6B80' }}>Sin mensajes programados para {modeloSel?.model_name ?? 'este modelo'}.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {agenda.map((g) => (
            <div key={g.dia}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 capitalize" style={{ color: '#6B6B80' }}>{g.label}</p>
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
                {g.items.map((x, i) => {
                  const est = estadoDe(x)
                  const Icon = TIPOS.find((t) => t.key === x.tipo)?.icon ?? MessageSquare
                  return (
                    <div key={x.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderTop: i === 0 ? 'none' : '1px solid #1E1E2E' }}>
                      <span className="text-xs w-12 flex-shrink-0" style={{ color: '#8B8B9E' }}>
                        {new Date(x.fecha_programada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {x.tipo === 'foto' && x.archivo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={x.archivo_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" style={{ border: '1px solid #1E1E2E' }} />
                      ) : (
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#8B8B9E' }}>
                          <Icon size={15} />
                        </span>
                      )}
                      <span className="flex-1 text-sm truncate" style={{ color: '#F0F0F5' }} title={x.texto ?? x.archivo_url ?? ''}>
                        {x.texto || <span style={{ color: '#6B6B80' }}>{x.tipo === 'texto' ? '—' : `(${x.tipo})`}</span>}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs flex-shrink-0" style={{ color: est.color }} title={x.error ?? ''}>
                        <est.Icon size={13} /> {est.label}
                      </span>
                      <button onClick={async () => { if (confirm('¿Eliminar este mensaje?')) { await eliminarMensaje(x.id); window.location.reload() } }}
                        title="Eliminar" style={{ color: '#6B6B80' }} className="flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
