'use client'

import { useState } from 'react'
import { toggleChatter, actualizarChatterHorario } from '@/app/(dashboard)/modulo-4/actions'
import { Power, Info } from 'lucide-react'

interface Chatter { id: string; nombre: string; turno: string | null; equipo: number | null; activo: boolean }

const TURNOS = ['Mañana', 'Tarde', 'Noche']
const EQUIPOS = [1, 2, 3, 4]

export default function GestionChatters({ chatters }: { chatters: Chatter[] }) {
  const [busy, setBusy] = useState<string | null>(null)

  const miniSelect = { backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 12 } as const

  async function cambiarActivo(id: string, activo: boolean) {
    setBusy(id)
    try { await toggleChatter(id, activo) } finally { setBusy(null) }
  }
  async function cambiarTurno(id: string, turno: string) {
    setBusy(id)
    try { await actualizarChatterHorario(id, { turno }) } finally { setBusy(null) }
  }
  async function cambiarEquipo(id: string, equipo: string) {
    setBusy(id)
    try { await actualizarChatterHorario(id, { equipo: equipo ? Number(equipo) : null }) } finally { setBusy(null) }
  }

  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Nota: los chatters vienen de Empleados */}
      <div className="flex items-start gap-2 mb-4 rounded-xl p-3"
        style={{ backgroundColor: 'rgba(201,168,76,0.06)', border: '1px solid var(--gold-15)' }}>
        <Info size={14} style={{ color: 'var(--gold)' }} className="flex-shrink-0 mt-0.5" />
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Los chatters se dan de alta en <span style={{ color: 'var(--gold)' }}>Empleados</span> con rol <b>Chatter</b>.
          Aquí solo les asignas <b>turno</b> y <b>equipo</b>, y gestionas su actividad.
        </p>
      </div>

      {chatters.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
          Aún no hay chatters. Crea empleados con rol Chatter en la sección Empleados.
        </p>
      ) : (
        <div className="space-y-2">
          {chatters.map((c) => (
            <div key={c.id}
              className="flex items-center gap-3 rounded-xl border px-4 py-2.5 flex-wrap"
              style={{ backgroundColor: '#0D0D14', borderColor: 'var(--border)', opacity: busy === c.id ? 0.5 : 1 }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.activo ? '#22C55E' : 'var(--muted)' }} />
              <span className="flex-1 min-w-[120px] text-sm" style={{ color: 'var(--foreground)' }}>{c.nombre}</span>

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
                style={{ color: c.activo ? '#EAB308' : '#22C55E', border: '1px solid var(--border)' }}
                title={c.activo ? 'Marcar inactivo' : 'Marcar activo'}>
                <Power size={12} /> {c.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
