'use client'

import { useEffect, useState } from 'react'
import { crearTarea, iniciarTarea, completarTarea, reabrirTarea, eliminarTarea } from '@/app/(dashboard)/modulo-14/actions'
import { Plus, Trash2, CheckCircle2, Circle, RotateCcw, CalendarDays, Copy, Check, Send, Play, Square, Timer } from 'lucide-react'

interface Persona { id: string; full_name: string; role: string }
interface Tarea {
  id: string; titulo: string; descripcion: string | null
  asignado_a: string; asignado_por: string | null; estado: string
  fecha_limite: string | null; started_at: string | null; completada_at: string | null
  asignado_nombre: string | null; mia: boolean; asignada_por_mi: boolean
}

const ROL_LABEL: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', team_leader: 'Team Leader',
  chatter: 'Chatter', va: 'VA', modelo: 'Modelo',
}

function fmtDur(ms: number): string {
  const s = Math.max(Math.floor(ms / 1000), 0)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export default function Tareas({ esStaff, personas, tareas }: { esStaff: boolean; personas: Persona[]; tareas: Tarea[] }) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [asignadoA, setAsignadoA] = useState('')
  const [fecha, setFecha] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'mias' | 'asignadas' | 'pendientes' | 'completadas'>('todas')
  const [copiado, setCopiado] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  const lista = tareas.filter((t) => {
    if (filtro === 'mias') return t.mia
    if (filtro === 'asignadas') return t.asignada_por_mi && !t.mia
    if (filtro === 'pendientes') return t.estado !== 'completada'
    if (filtro === 'completadas') return t.estado === 'completada'
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

  async function iniciar(t: Tarea) { await iniciarTarea(t.id); window.location.reload() }
  async function finalizar(t: Tarea) { await completarTarea(t.id); window.location.reload() }
  async function reabrir(t: Tarea) { if (t.asignada_por_mi) { await reabrirTarea(t.id); window.location.reload() } }

  async function copiar(t: Tarea) {
    const texto = t.descripcion ? `${t.titulo}\n${t.descripcion}` : t.titulo
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(t.id)
      setTimeout(() => setCopiado((c) => (c === t.id ? null : c)), 1500)
    } catch { /* nada */ }
  }

  const FILTROS = esStaff
    ? (['todas', 'mias', 'asignadas', 'pendientes', 'completadas'] as const)
    : (['todas', 'pendientes', 'completadas'] as const)
  const FILTRO_LABEL: Record<string, string> = {
    todas: 'Todas', mias: 'Mías', asignadas: 'Asignadas por mí', pendientes: 'Pendientes', completadas: 'Completadas',
  }

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
            className="rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: filtro === f ? 'rgba(201,168,76,0.15)' : '#1E1E2E', color: filtro === f ? '#C9A84C' : '#8B8B9E' }}>
            {FILTRO_LABEL[f]}
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
            const completed = t.estado === 'completada'
            const running = !completed && !!t.started_at
            const delegada = t.asignada_por_mi && !t.mia
            // duración
            const durMs = t.started_at
              ? (completed && t.completada_at ? +new Date(t.completada_at) - +new Date(t.started_at) : now - +new Date(t.started_at))
              : null
            return (
              <div key={t.id} className="flex items-start gap-3 rounded-xl border px-4 py-3"
                style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
                {/* Estado / ícono */}
                <div className="mt-0.5 flex-shrink-0">
                  {completed ? <CheckCircle2 size={18} style={{ color: '#22C55E' }} />
                    : running ? <Timer size={18} style={{ color: '#3B82F6' }} />
                    : <Circle size={18} style={{ color: '#6B6B80' }} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: completed ? '#6B6B80' : '#F0F0F5', textDecoration: completed ? 'line-through' : 'none' }}>{t.titulo}</p>
                  {t.descripcion && (
                    <p className="text-xs mt-1" style={{ color: '#8B8B9E', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{t.descripcion}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-[11px] flex-wrap" style={{ color: '#6B6B7E' }}>
                    {delegada && (
                      <span className="inline-flex items-center gap-1" style={{ color: completed ? '#22C55E' : '#EAB308' }}>
                        <Send size={10} /> para {t.asignado_nombre ?? '—'} · {completed ? 'completada' : running ? 'en progreso' : 'pendiente'}
                      </span>
                    )}
                    {running && durMs != null && (
                      <span className="inline-flex items-center gap-1" style={{ color: '#3B82F6' }}>
                        <Timer size={11} /> {fmtDur(durMs)}
                      </span>
                    )}
                    {completed && durMs != null && (
                      <span style={{ color: '#22C55E' }}>Tardó {fmtDur(durMs)}</span>
                    )}
                    {t.fecha_limite && <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {new Date(t.fecha_limite).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Iniciar / Finalizar (solo la persona asignada) */}
                  {t.mia && !completed && !running && (
                    <button onClick={() => iniciar(t)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                      style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}>
                      <Play size={12} /> Iniciar
                    </button>
                  )}
                  {t.mia && running && (
                    <button onClick={() => finalizar(t)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                      style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                      <Square size={11} /> Finalizar
                    </button>
                  )}

                  <button onClick={() => copiar(t)} title="Copiar" style={{ color: copiado === t.id ? '#22C55E' : '#8B8B9E' }}>
                    {copiado === t.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  {t.asignada_por_mi && completed && (
                    <button onClick={() => reabrir(t)} title="Reabrir" style={{ color: '#8B8B9E' }}><RotateCcw size={14} /></button>
                  )}
                  {t.asignada_por_mi && (
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
