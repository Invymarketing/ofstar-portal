'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, MoreVertical, Check, Trash2,
  ChevronLeft, ChevronRight, ListTodo, Plus,
} from 'lucide-react'

interface Tarea { id: string; fecha: string; titulo: string; completada: boolean }
interface Todo { id: string; texto: string; hecho: boolean }

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function lunesDe(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() + n)
  return x
}
function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function HorarioModelo({ modeloId }: { modeloId: string }) {
  const [lunes, setLunes] = useState<Date>(() => lunesDe(new Date()))
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [cargando, setCargando] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [menuId, setMenuId] = useState<string | null>(null)
  const [todoDraft, setTodoDraft] = useState('')

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(lunes, i)), [lunes])
  const lunesIso = iso(lunes)
  const hoyIso = iso(new Date())

  const rangoLabel = `${dias[0].getDate()} ${MESES[dias[0].getMonth()]} – ${dias[6].getDate()} ${MESES[dias[6].getMonth()]}`

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`/api/modelos/${modeloId}/horario?lunes=${lunesIso}`)
      const d = await r.json()
      setTareas(d.tareas ?? [])
      setTodos(d.todos ?? [])
    } catch {
      setTareas([])
      setTodos([])
    }
    setCargando(false)
  }, [modeloId, lunesIso])

  useEffect(() => { cargar() }, [cargar])

  async function post(body: any) {
    await fetch(`/api/modelos/${modeloId}/horario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await cargar()
  }

  async function addTarea(fecha: string) {
    const titulo = (drafts[fecha] ?? '').trim()
    if (!titulo) return
    setDrafts((s) => ({ ...s, [fecha]: '' }))
    await post({ op: 'add', fecha, titulo })
  }

  async function addTodo() {
    const texto = todoDraft.trim()
    if (!texto) return
    setTodoDraft('')
    await post({ op: 'todoAdd', texto })
  }

  const hechos = todos.filter((t) => t.hecho).length

  return (
    <div className="space-y-4">
      {menuId && <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />}

      {/* ===== HORARIO SEMANAL ===== */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div
          className="flex items-center justify-between px-5 py-4 flex-wrap gap-3"
          style={{ background: 'linear-gradient(90deg, var(--gold-15), transparent)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center h-9 w-9 rounded-xl" style={{ backgroundColor: 'var(--gold-15)' }}>
              <CalendarDays size={18} style={{ color: 'var(--gold)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Horario semanal</h3>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{rangoLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLunes((l) => addDays(l, -7))}
              className="grid place-items-center h-8 w-8 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              aria-label="Semana anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setLunes(lunesDe(new Date()))}
              className="px-3 h-8 rounded-lg text-xs font-medium transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
            >
              Hoy
            </button>
            <button
              onClick={() => setLunes((l) => addDays(l, 7))}
              className="grid place-items-center h-8 w-8 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              aria-label="Semana siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {dias.map((f, i) => {
              const fISO = iso(f)
              const esHoy = fISO === hoyIso
              const tDia = tareas.filter((t) => t.fecha === fISO)
              const done = tDia.filter((t) => t.completada).length
              return (
                <div
                  key={fISO}
                  className="rounded-xl flex flex-col"
                  style={{
                    border: esHoy ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                  }}
                >
                  <div className="px-2.5 pt-2.5 pb-2 flex items-center justify-between gap-1">
                    <p className="text-sm font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
                      {DIAS[i]}{' '}
                      <span style={{ color: esHoy ? 'var(--gold)' : 'var(--foreground)' }}>{f.getDate()}</span>
                    </p>
                    {tDia.length > 0 && (
                      <span className="text-[10px] font-semibold shrink-0" style={{ color: done === tDia.length ? 'var(--gold)' : 'var(--muted)' }}>
                        {done}/{tDia.length}
                      </span>
                    )}
                  </div>

                  <div className="px-2 flex flex-col gap-1.5 min-h-[24px]">
                    {tDia.map((t) => (
                      <div
                        key={t.id}
                        className="group rounded-lg px-2 py-1.5 text-xs flex items-start gap-1.5 relative"
                        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                      >
                        <button
                          onClick={() => post({ op: 'toggle', id: t.id })}
                          className="mt-[1px] shrink-0 h-4 w-4 rounded grid place-items-center transition-colors"
                          style={{ border: '1px solid var(--border)', backgroundColor: t.completada ? 'var(--gold)' : 'transparent' }}
                          aria-label="Completar"
                        >
                          {t.completada && <Check size={11} style={{ color: '#000' }} />}
                        </button>
                        <span
                          className="flex-1 leading-snug break-words"
                          style={{
                            color: t.completada ? 'var(--muted)' : 'var(--foreground)',
                            textDecoration: t.completada ? 'line-through' : 'none',
                          }}
                        >
                          {t.titulo}
                        </span>
                        <button
                          onClick={() => setMenuId(menuId === t.id ? null : t.id)}
                          className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--muted)' }}
                          aria-label="Opciones"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {menuId === t.id && (
                          <div
                            className="absolute right-1 top-7 z-20 rounded-lg py-1 w-36 shadow-xl"
                            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                          >
                            <p className="px-2.5 py-1 text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Mover a</p>
                            {DIAS.map((dn, di) => {
                              const df = iso(dias[di])
                              if (df === fISO) return null
                              return (
                                <button
                                  key={di}
                                  onClick={() => { post({ op: 'move', id: t.id, fecha: df }); setMenuId(null) }}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:opacity-70"
                                  style={{ color: 'var(--foreground)' }}
                                >
                                  {dn}
                                </button>
                              )
                            })}
                            <div className="my-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                            <button
                              onClick={() => { post({ op: 'del', id: t.id }); setMenuId(null) }}
                              className="w-full text-left px-2.5 py-1 text-xs flex items-center gap-1.5 hover:opacity-70"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-2">
                    <div
                      className="flex items-center gap-1 rounded-lg px-1.5"
                      style={{ border: '1px dashed var(--border)' }}
                    >
                      <Plus size={13} style={{ color: 'var(--muted)' }} className="shrink-0" />
                      <input
                        value={drafts[fISO] ?? ''}
                        onChange={(e) => setDrafts((s) => ({ ...s, [fISO]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') addTarea(fISO) }}
                        placeholder="Añadir tarea"
                        className="flex-1 bg-transparent py-1.5 text-xs outline-none"
                        style={{ color: 'var(--foreground)' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ===== TO-DO LIST ===== */}
      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-3">
          <ListTodo size={16} style={{ color: 'var(--gold)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Lista de tareas</h3>
          {todos.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{hechos}/{todos.length}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5 mb-3">
          {todos.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-2 rounded-lg px-2.5 py-2"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
            >
              <button
                onClick={() => post({ op: 'todoToggle', id: t.id })}
                className="shrink-0 h-4 w-4 rounded grid place-items-center transition-colors"
                style={{ border: '1px solid var(--border)', backgroundColor: t.hecho ? 'var(--gold)' : 'transparent' }}
                aria-label="Completar"
              >
                {t.hecho && <Check size={11} style={{ color: '#000' }} />}
              </button>
              <span
                className="flex-1 text-sm"
                style={{
                  color: t.hecho ? 'var(--muted)' : 'var(--foreground)',
                  textDecoration: t.hecho ? 'line-through' : 'none',
                }}
              >
                {t.texto}
              </span>
              <button
                onClick={() => post({ op: 'todoDel', id: t.id })}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: '#ef4444' }}
                aria-label="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!cargando && todos.length === 0 && (
            <p className="text-xs py-1" style={{ color: 'var(--muted)' }}>No hay tareas en la lista todavía.</p>
          )}
        </div>

        <div
          className="flex items-center gap-1.5 rounded-lg px-2"
          style={{ border: '1px dashed var(--border)' }}
        >
          <Plus size={14} style={{ color: 'var(--muted)' }} className="shrink-0" />
          <input
            value={todoDraft}
            onChange={(e) => setTodoDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
            placeholder="Añadir a la lista…"
            className="flex-1 bg-transparent py-2 text-sm outline-none"
            style={{ color: 'var(--foreground)' }}
          />
        </div>
      </div>
    </div>
  )
}
