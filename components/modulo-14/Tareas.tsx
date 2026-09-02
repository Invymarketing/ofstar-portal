'use client'

import { useState } from 'react'
import { crearTarea, completarTarea, reabrirTarea, eliminarTarea } from '@/app/(dashboard)/modulo-14/actions'
import { Plus, Trash2, CheckCircle2, Circle, RotateCcw, CalendarDays, Copy, Check } from 'lucide-react'

interface Persona { id: string; full_name: string; role: string }
interface Tarea {
  id: string; titulo: string; descripcion: string | null
  asignado_a: string; asignado_por: string | null; estado: string
  fecha_limite: string | null; completada_at: string | null
  asignado_nombre: string | null; mia: boolean
}

const ROL_LABEL: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', team_leader: 'Team Leader',
  chatter: 'Chatter', va: 'VA', modelo: 'Modelo',
}

export default function Tareas({ esStaff, personas, tareas }: { esStaff: boolean; personas: Persona[]; tareas: Tarea[] }) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [asignadoA, setAsignadoA] = useState('')
  const [fecha, setFecha] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'completadas' | 'mias'>('todas')
  const [copiado, setCopiado] = useState<string | null>(null)

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  const lista = tareas.filter((t) => {
    if (filtro === 'pendientes') return t.estado === 'pendiente'
    if (filtro === 'completadas') return t.estado === 'completada'
    if (filtro === 'mias') return t.mia
    return true
  })

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSaving(true)
    try {
      await crearTarea({ titulo, descripcion, asignado_a: asignadoA, fecha_limite: fecha || undefined })
      setTitulo(''); setDescripcion(''); setAsignadoA(''); setFecha('')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(t: Tarea) {
    if (t.estado === 'completada') { if (esStaff) { await reabrirTarea(t.id); window.location.reload() } }
    else { await completarTarea(t.id); window.location.reload() }
  }

  async function copiar(t: Tarea) {
    const texto = t.descripcion ? `${t.titulo}\n${t.descripcion}` : t.titulo
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(t.id)
      setTimeout(() => setCopiado((c) => (c === t.id ? null : c)), 1500)
    } catch { /* nada */ }
  }

  const FILTROS = esStaff
    ? (['todas', 'pendientes', 'completadas', 'mias'] as const)
    : (['todas', 'pendientes', 'completadas'] as const)

  return (
    <div className="space-y-6">
      {/* Formulario (solo staff) */}
      {esStaff && (
        <form onSubmit={crear} className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
          <div className="sm:col-span-2">
            <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Tarea</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required
              placeholder="¿Qué hay que hacer?" className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Asignar a</label>
            <select value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)} required
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              <option value="">Elegir…</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} · {ROL_LABEL[p.role] ?? p.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Fecha límite (opcional)</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Detalle (opcional)</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="Instrucciones…" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
              <Plus size={15} /> {saving ? 'Asignando…' : 'Asignar tarea'}
            </button>
            {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTROS.map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize"
            style={{ backgroundColor: filtro === f ? 'rgba(201,168,76,0.15)' : '#1E1E2E', color: filtro === f ? '#C9A84C' : '#8B8B9E' }}>
            {f === 'mias' ? 'Mías' : f}
          </button>
        ))}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
          <p className="text-sm" style={{ color: '#6B6B80' }}>No hay tareas aquí.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((t) => {
            const hecha = t.estado === 'completada'
            const puedeMarcar = t.mia || esStaff
            return (
              <div key={t.id} className="flex items-start gap-3 rounded-xl border px-4 py-3"
                style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
                <button onClick={() => puedeMarcar && toggle(t)} disabled={!puedeMarcar} className="mt-0.5 flex-shrink-0"
                  title={hecha ? (esStaff ? 'Reabrir' : 'Completada') : 'Marcar completada'}
                  style={{ color: hecha ? '#22C55E' : '#6B6B80', cursor: puedeMarcar ? 'pointer' : 'default' }}>
                  {hecha ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: hecha ? '#6B6B80' : '#F0F0F5', textDecoration: hecha ? 'line-through' : 'none' }}>{t.titulo}</p>
                  {t.descripcion && (
                    <p className="text-xs mt-1" style={{ color: '#8B8B9E', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{t.descripcion}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: '#6B6B7E' }}>
                    {esStaff && t.asignado_nombre && <span>→ {t.asignado_nombre}</span>}
                    {t.fecha_limite && <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {new Date(t.fecha_limite).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>}
                    {hecha && t.completada_at && <span style={{ color: '#22C55E' }}>✓ completada {new Date(t.completada_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => copiar(t)} title="Copiar" style={{ color: copiado === t.id ? '#22C55E' : '#8B8B9E' }}>
                    {copiado === t.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  {esStaff && hecha && (
                    <button onClick={() => toggle(t)} title="Reabrir" style={{ color: '#8B8B9E' }}><RotateCcw size={14} /></button>
                  )}
                  {esStaff && (
                    <button onClick={async () => { if (confirm('¿Eliminar esta tarea?')) { await eliminarTarea(t.id); window.location.reload() } }}
                      title="Eliminar" style={{ color: '#6B6B80' }}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
