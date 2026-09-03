'use client'

import { useState } from 'react'
import { crearCustom, actualizarCustom } from '@/app/(dashboard)/modulo-17/actions'
import { createClient } from '@/lib/supabase/client'
import { PhoneCall, Send, ImagePlus, X } from 'lucide-react'

interface Modelo { id: string; model_name: string }
interface Custom {
  id: string; created_by: string | null; chatter_nombre: string | null
  modelo: string | null; fan: string | null; tipo: string | null
  precio: number | null; duracion: string | null; estado: string
  notas: string | null; seguimiento: string | null; imagen_url: string | null
  fecha: string | null; created_at: string
}

const TIPOS = ['Videollamada', 'Custom']
const DURACIONES = ['5 min', '10 min', '15 min', '20 min', '30 min', '+30 min']
const ESTADOS = ['Pendiente', 'En proceso', 'Entregado', 'Cancelado']
const ESTADO_COLOR: Record<string, string> = {
  Pendiente: '#EAB308', 'En proceso': '#3B82F6', Entregado: '#22C55E', Cancelado: '#EF4444',
}
const money = (n: number | null) => (n != null ? '$' + Number(n).toLocaleString('en-US') : '—')

export default function CustomVC(
  { esStaff, modelos, customs }: { esStaff: boolean; modelos: Modelo[]; customs: Custom[] }
) {
  const supabase = createClient()

  const [modeloId, setModeloId] = useState('')
  const [tipo, setTipo] = useState('Videollamada')
  const [fan, setFan] = useState('')
  const [precio, setPrecio] = useState('')
  const [duracion, setDuracion] = useState('')
  const [fecha, setFecha] = useState('')
  const [notas, setNotas] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(false); setSaving(true)
    try {
      let imagen_url: string | null = null
      if (foto) {
        const safe = foto.name.replace(/[^a-zA-Z0-9._-]/g, '')
        const path = `custom/${Date.now()}_${safe}`
        const { error: upErr } = await supabase.storage.from('pruebas').upload(path, foto, { upsert: false })
        if (upErr) throw new Error('No se pudo subir la foto: ' + upErr.message)
        imagen_url = supabase.storage.from('pruebas').getPublicUrl(path).data.publicUrl
      }
      await crearCustom({
        modelo_id: modeloId || null,
        tipo,
        fan,
        precio: precio ? Number(precio) : null,
        duracion,
        fecha: fecha || undefined,
        notas,
        imagen_url,
      })
      setOk(true)
      setFan(''); setPrecio(''); setDuracion(''); setFecha(''); setNotas(''); setFoto(null)
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <form onSubmit={enviar} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <PhoneCall size={16} style={{ color: 'var(--gold)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Registrar custom / videollamada</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Modelo</label>
            <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} required
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              <option value="">Elige modelo…</option>
              {modelos.map((m) => <option key={m.id} value={m.id}>{m.model_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Fan / usuario</label>
            <input value={fan} onChange={(e) => setFan(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="@usuario del fan" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Precio (US$)</label>
            <input type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="0" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Duración</label>
            <select value={duracion} onChange={(e) => setDuracion(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              <option value="">—</option>
              {DURACIONES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Fecha (opcional)</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Notas</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="Detalles del pedido, referencias, etc." />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Foto de referencia (opcional)</label>
            {foto ? (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={inputStyle}>
                <span className="truncate flex-1" style={{ color: 'var(--foreground)' }}>{foto.name}</span>
                <button type="button" onClick={() => setFoto(null)} style={{ color: '#EF4444' }}><X size={14} /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs cursor-pointer"
                style={{ ...inputStyle, color: 'var(--muted)' }}>
                <ImagePlus size={14} /> Subir imagen
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
            <Send size={15} /> {saving ? 'Enviando…' : 'Enviar al manager'}
          </button>
          {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
          {ok && <span className="text-xs" style={{ color: '#22C55E' }}>✓ Registrado y enviado como tarea al manager</span>}
        </div>
      </form>

      {/* Lista */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
          {esStaff ? 'Todos los pedidos' : 'Tus pedidos'} · {customs.length}
        </div>
        {customs.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: 'var(--muted)' }}>Aún no hay pedidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal px-4 py-2 text-xs">Fecha</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Tipo</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                  {esStaff && <th className="text-left font-normal px-4 py-2 text-xs">Chatter</th>}
                  <th className="text-right font-normal px-4 py-2 text-xs">Precio</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Dur.</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Ref.</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Estado</th>
                  {esStaff && <th className="text-left font-normal px-4 py-2 text-xs">Seguimiento</th>}
                </tr>
              </thead>
              <tbody>
                {customs.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {new Date(c.fecha ?? c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-2">{c.modelo ?? '—'}</td>
                    <td className="px-4 py-2">{c.tipo ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{c.fan ?? '—'}</td>
                    {esStaff && <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{c.chatter_nombre ?? '—'}</td>}
                    <td className="px-4 py-2 text-right" style={{ color: 'var(--gold)' }}>{money(c.precio)}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{c.duracion ?? '—'}</td>
                    <td className="px-4 py-2">
                      {c.imagen_url
                        ? <a href={c.imagen_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6' }}>ver</a>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {esStaff ? (
                        <select defaultValue={c.estado}
                          onChange={async (e) => { await actualizarCustom(c.id, { estado: e.target.value }); window.location.reload() }}
                          className="rounded-lg px-2 py-1 text-xs"
                          style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: ESTADO_COLOR[c.estado] ?? 'var(--foreground)' }}>
                          {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs" style={{ color: ESTADO_COLOR[c.estado] ?? 'var(--muted)' }}>{c.estado}</span>
                      )}
                    </td>
                    {esStaff && (
                      <td className="px-4 py-2">
                        <input defaultValue={c.seguimiento ?? ''} placeholder="Nota…"
                          onBlur={async (e) => { if (e.target.value !== (c.seguimiento ?? '')) { await actualizarCustom(c.id, { seguimiento: e.target.value }) } }}
                          className="rounded-lg px-2 py-1 text-xs w-36" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
