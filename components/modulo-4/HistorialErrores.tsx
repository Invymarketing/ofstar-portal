'use client'

import { useState } from 'react'
import { actualizarEstadoError, eliminarError } from '@/app/(dashboard)/modulo-4/actions'
import { Trash2 } from 'lucide-react'

interface ErrorRow {
  id: string
  chatter_nombre: string
  categoria_nombre: string
  gravedad: string
  modelo: string | null
  fecha_error: string
  descripcion: string | null
  prueba_url: string | null
  estado: 'abierto' | 'coaching' | 'cerrado'
}

const GRAVEDAD_COLOR: Record<string, string> = {
  grave: '#EF4444', media: '#EAB308', leve: '#22C55E',
}
const ESTADOS: ErrorRow['estado'][] = ['abierto', 'coaching', 'cerrado']

export default function HistorialErrores({ errores }: { errores: ErrorRow[] }) {
  const [busy, setBusy] = useState<string | null>(null)

  if (errores.length === 0) {
    return (
      <div className="rounded-2xl border p-6 text-sm text-center"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
        No hay errores registrados todavía.
      </div>
    )
  }

  async function cambiarEstado(id: string, estado: ErrorRow['estado']) {
    setBusy(id)
    try { await actualizarEstadoError(id, estado) } finally { setBusy(null) }
  }
  async function borrar(id: string) {
    if (!confirm('¿Eliminar este error?')) return
    setBusy(id)
    try { await eliminarError(id) } finally { setBusy(null) }
  }

  return (
    <div className="space-y-2">
      {errores.map((e) => (
        <div key={e.id}
          className="rounded-xl border px-4 py-3 flex items-start gap-3"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', opacity: busy === e.id ? 0.5 : 1 }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{e.chatter_nombre}</span>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--border)', color: GRAVEDAD_COLOR[e.gravedad] ?? 'var(--muted)' }}>
                {e.categoria_nombre}
              </span>
              {e.modelo && <span className="text-xs" style={{ color: 'var(--muted)' }}>· {e.modelo}</span>}
              <span className="text-xs" style={{ color: 'var(--muted)' }}>· {e.fecha_error}</span>
            </div>
            {e.descripcion && <p className="text-xs mt-1" style={{ color: '#A0A0B0' }}>{e.descripcion}</p>}
            {e.prueba_url && (
              <a href={e.prueba_url} target="_blank" rel="noopener noreferrer"
                className="text-xs underline" style={{ color: 'var(--gold)' }}>ver prueba</a>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select value={e.estado} disabled={busy === e.id}
              onChange={(ev) => cambiarEstado(e.id, ev.target.value as ErrorRow['estado'])}
              className="rounded-lg px-2 py-1 text-xs"
              style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
              {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => borrar(e.id)} disabled={busy === e.id}
              className="p-1.5 rounded-lg" style={{ color: 'var(--muted)' }} title="Eliminar">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
