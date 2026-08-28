'use client'

import { useState } from 'react'
import { crearMensaje, eliminarMensaje } from '@/app/(dashboard)/modulo-13/actions'
import { Send, Trash2, Clock, CheckCircle2, XCircle, RefreshCw, MessageSquare, Image as ImageIcon, Video } from 'lucide-react'

interface Modelo { id: string; model_name: string; tiene_grupo: boolean }
interface Mensaje {
  id: string; modelo: string | null; tipo: string; texto: string | null
  archivo_url: string | null; fecha_programada: string; enviado: boolean
  enviado_at: string | null; error: string | null
}

const TIPOS = [
  { key: 'texto', label: 'Texto', icon: MessageSquare },
  { key: 'foto', label: 'Foto', icon: ImageIcon },
  { key: 'video', label: 'Video', icon: Video },
] as const

function fechaLocalDefault() {
  const d = new Date(Date.now() + 5 * 60 * 1000) // +5 min
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export default function ProgramadorTelegram({ modelos, mensajes }: { modelos: Modelo[]; mensajes: Mensaje[] }) {
  const [modeloId, setModeloId] = useState('')
  const [tipo, setTipo] = useState<'texto' | 'foto' | 'video'>('texto')
  const [texto, setTexto] = useState('')
  const [archivoUrl, setArchivoUrl] = useState('')
  const [fecha, setFecha] = useState(fechaLocalDefault())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(false); setSaving(true)
    try {
      await crearMensaje({
        modelo_id: modeloId, tipo, texto,
        archivo_url: archivoUrl,
        fecha_programada: new Date(fecha).toISOString(),
      })
      setOk(true); setTexto(''); setArchivoUrl(''); setFecha(fechaLocalDefault())
      setTimeout(() => window.location.reload(), 900)
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
      setTimeout(() => window.location.reload(), 1000)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <form onSubmit={crear} className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Modelo (grupo destino)</label>
            <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} required
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              <option value="">Elegir…</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.model_name}{m.tiene_grupo ? '' : ' (sin grupo)'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Fecha y hora de envío</label>
            <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
        </div>

        {/* Tipo */}
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
            <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>URL del {tipo} (pública)</label>
            <input type="url" value={archivoUrl} onChange={(e) => setArchivoUrl(e.target.value)}
              placeholder="https://…" className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
        )}

        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>
            {tipo === 'texto' ? 'Mensaje' : 'Caption (opcional)'}
          </label>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}
            placeholder={tipo === 'texto' ? 'Buenos días… ☀️' : 'Texto que acompaña al archivo…'} />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
            <Send size={15} /> {saving ? 'Programando…' : 'Programar'}
          </button>
          <button type="button" onClick={enviarAhora} disabled={syncing}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50"
            style={{ backgroundColor: '#1E1E2E', color: '#F0F0F5' }}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Enviando…' : 'Enviar pendientes ahora'}
          </button>
          {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
          {ok && <span className="text-xs" style={{ color: '#22C55E' }}>✓ Programado</span>}
          {msg && <span className="text-xs" style={{ color: '#C9A84C' }}>{msg}</span>}
        </div>
      </form>

      {/* Cola */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6B6B80', borderBottom: '1px solid #1E1E2E' }}>
          Mensajes programados
        </div>
        {mensajes.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: '#6B6B80' }}>Aún no hay mensajes programados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6B6B80' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Fecha</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Tipo</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Mensaje</th>
                <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {mensajes.map((m) => {
                const estado = m.enviado
                  ? { label: 'Enviado', color: '#22C55E', Icon: CheckCircle2 }
                  : m.error
                    ? { label: 'Error', color: '#EF4444', Icon: XCircle }
                    : { label: 'Pendiente', color: '#EAB308', Icon: Clock }
                return (
                  <tr key={m.id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: '#6B6B80' }}>
                      {new Date(m.fecha_programada).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{m.modelo ?? '—'}</td>
                    <td className="px-4 py-2 capitalize" style={{ color: '#6B6B80' }}>{m.tipo}</td>
                    <td className="px-4 py-2 max-w-[220px] truncate" title={m.texto ?? m.archivo_url ?? ''}>
                      {m.texto ?? m.archivo_url ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className="inline-flex items-center gap-1 text-xs" style={{ color: estado.color }} title={m.error ?? ''}>
                        <estado.Icon size={13} /> {estado.label}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button onClick={async () => { if (confirm('¿Eliminar este mensaje?')) { await eliminarMensaje(m.id); window.location.reload() } }}
                        title="Eliminar" style={{ color: '#6B6B80' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
