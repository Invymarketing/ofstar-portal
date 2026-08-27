'use client'

import { useState } from 'react'
import { addChatter, toggleChatter, deleteChatter, actualizarChatterHorario } from '@/app/(dashboard)/modulo-4/actions'
import { UserPlus, Trash2, Power } from 'lucide-react'

interface Chatter { id: string; nombre: string; turno: string | null; equipo: number | null; activo: boolean }

const TURNOS = ['Mañana', 'Tarde', 'Noche']
const EQUIPOS = [1, 2, 3, 4]

export default function GestionChatters({ chatters }: { chatters: Chatter[] }) {
  const [nombre, setNombre] = useState('')
  const [turno, setTurno] = useState('')
  const [equipo, setEquipo] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSaving(true)
    try {
      await addChatter({ nombre, turno, equipo: equipo ? Number(equipo) : null })
      setNombre(''); setTurno(''); setEquipo('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar')
    } finally {
      setSaving(false)
    }
  }

  async function cambiarActivo(id: string, activo: boolean) {
    setBusy(id)
    try { await toggleChatter(id, activo) } finally { setBusy(null) }
  }

  async function borrar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a "${nombre}"? Se borrarán también sus errores registrados.`)) return
    setBusy(id)
    try { await deleteChatter(id) } finally { setBusy(null) }
  }

  async function cambiarTurno(id: string, turno: string) {
    setBusy(id)
    try { await actualizarChatterHorario(id, { turno }) } finally { setBusy(null) }
  }
  async function cambiarEquipo(id: string, equipo: string) {
    setBusy(id)
    try { await actualizarChatterHorario(id, { equipo: equipo ? Number(equipo) : null }) } finally { setBusy(null) }
  }

  const miniSelect = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5', fontSize: 12 } as const

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
      {/* Form agregar */}
      <form onSubmit={agregar} className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
          placeholder="Nombre completo del chatter"
          className="flex-1 min-w-[180px] rounded-lg px-3 py-2 text-sm" style={inputStyle} />
        <select value={turno} onChange={(e) => setTurno(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          <option value="">Turno</option>
          {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={equipo} onChange={(e) => setEquipo(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          <option value="">Equipo</option>
          {EQUIPOS.map((n) => <option key={n} value={n}>Equipo {n}</option>)}
        </select>
        <button type="submit" disabled={saving}
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
          <UserPlus size={15} /> {saving ? 'Agregando…' : 'Agregar chatter'}
        </button>
      </form>
      {error && <p className="text-xs mb-3" style={{ color: '#EF4444' }}>{error}</p>}

      {/* Lista */}
      {chatters.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: '#6B6B80' }}>
          Aún no hay chatters. Agrega el primero arriba.
        </p>
      ) : (
        <div className="space-y-2">
          {chatters.map((c) => (
            <div key={c.id}
              className="flex items-center gap-3 rounded-xl border px-4 py-2.5 flex-wrap"
              style={{ backgroundColor: '#0D0D14', borderColor: '#1E1E2E', opacity: busy === c.id ? 0.5 : 1 }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.activo ? '#22C55E' : '#6B6B80' }} />
              <span className="flex-1 min-w-[120px] text-sm" style={{ color: '#F0F0F5' }}>{c.nombre}</span>

              <select value={c.turno ?? ''} onChange={(e) => cambiarTurno(c.id, e.target.value)} disabled={busy === c.id}
                className="rounded-lg px-2 py-1" style={miniSelect}>
                <option value="">— turno —</option>
                {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={c.equipo ?? ''} onChange={(e) => cambiarEquipo(c.id, e.target.value)} disabled={busy === c.id}
                className="rounded-lg px-2 py-1" style={miniSelect}>
                <option value="">— equipo —</option>
                {EQUIPOS.map((n) => <option key={n} value={n}>Equipo {n}</option>)}
              </select>

              <button onClick={() => cambiarActivo(c.id, !c.activo)} disabled={busy === c.id}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                style={{ color: c.activo ? '#EAB308' : '#22C55E', border: '1px solid #1E1E2E' }}
                title={c.activo ? 'Desactivar' : 'Activar'}>
                <Power size={12} /> {c.activo ? 'Activo' : 'Inactivo'}
              </button>
              <button onClick={() => borrar(c.id, c.nombre)} disabled={busy === c.id}
                className="p-1.5 rounded-lg" style={{ color: '#EF4444' }} title="Eliminar">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
