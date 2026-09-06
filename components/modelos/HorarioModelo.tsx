'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, MoreVertical, Trash2, Plus, ListTodo, Check } from 'lucide-react'

interface Tarea { id: string; dia_semana: number; titulo: string }
interface Todo { id: string; texto: string; hecho: boolean }

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function HorarioModelo({ modeloId }: { modeloId: string }) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [cargando, setCargando] = useState(true)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [menuId, setMenuId] = useState<string | null>(null)
  const [todoDraft, setTodoDraft] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`/api/modelos/${modeloId}/horario`)
      const d = await r.json()
      setTareas(d.tareas ?? [])
      setTodos(d.todos ?? [])
    } catch {
      setTareas([]); setTodos([])
    }
    setCargando(false)
  }, [modeloId])

  useEffect(() => { cargar() }, [cargar])

  async function post(body: any) {
    await fetch(`/api/modelos/${modeloId}/horario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    await cargar()
  }

  async function addTarea(dia: number) {
    const titulo = (drafts[dia] ?? '').trim()
    if (!titulo) return
    setDrafts((s) => ({ ...s, [dia]: '' }))
    await post({ op: 'add', dia, titulo })
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
        <div className="flex items-center gap-2.5 px-5 py-4" style={{ background: 'linear-gradient(90deg, var(--gold-15), transparent)', borderBottom: '1px solid var(--border)' }}>
          <div className="grid place-items-center h-9 w-9 rounded-xl" style={{ backgroundColor: 'var(--gold-15)' }}>
            <CalendarDays size={18} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Horario semanal</h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Plantilla fija · se repite cada semana</p>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {DIAS.map((nombre, dia) => {
              const tDia = tareas.filter((t) => t.dia_semana === dia)
              return (
                <div key={dia} className="rounded-xl flex flex-col" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                  <div className="px-2.5 pt-2.5 pb-2 flex items-center gap-1.5">
                    <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{nombre}</span>
                    {tDia.length > 0 && <span className="text-[11px] font-semibold" style={{ color: 'var(--gold)' }}>{tDia.length}</span>}
                  </div>

                  <div className="px-2 flex flex-col gap-1.5 min-h-[16px]">
                    {tDia.map((t) => (
                      <div key={t.id} className="group rounded-lg px-2 py-1.5 text-xs flex items-start gap-1.5 relative" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <span className="flex-1 leading-snug break-words" style={{ color: 'var(--foreground)' }}>{t.titulo}</span>
                        <button onClick={() => setMenuId(menuId === t.id ? null : t.id)} className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted)' }} aria-label="Opciones">
                          <MoreVertical size={13} />
                        </button>
                        {menuId === t.id && (
                          <div className="absolute right-1 top-7 z-20 rounded-lg py-1 w-36 shadow-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <p className="px-2.5 py-1 text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Mover a</p>
                            {DIAS.map((dn, di) => di === dia ? null : (
                              <button key={di} onClick={() => { post({ op: 'move', tareaId: t.id, dia: di }); setMenuId(null) }} className="w-full text-left px-2.5 py-1 text-xs hover:opacity-70" style={{ color: 'var(--foreground)' }}>{dn}</button>
                            ))}
                            <div className="my-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                            <button onClick={() => { post({ op: 'del', tareaId: t.id }); setMenuId(null) }} className="w-full text-left px-2.5 py-1 text-xs flex items-center gap-1.5 hover:opacity-70" style={{ color: '#ef4444' }}>
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-2">
                    <div className="flex items-center gap-1 rounded-lg px-1.5" style={{ border: '1px dashed var(--border)' }}>
                      <Plus size={13} style={{ color: 'var(--muted)' }} className="shrink-0" />
                      <input value={drafts[dia] ?? ''} onChange={(e) => setDrafts((s) => ({ ...s, [dia]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addTarea(dia) }} placeholder="Añadir tarea" className="flex-1 bg-transparent py-1.5 text-xs outline-none" style={{ color: 'var(--foreground)' }} />
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
        <div className="flex items-center gap-2 mb-1">
          <ListTodo size={16} style={{ color: 'var(--gold)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>TO-DO List</h3>
          {todos.length > 0 && <span className="text-xs" style={{ color: 'var(--muted)' }}>{hechos}/{todos.length}</span>}
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Objetivos de la semana. La modelo marca el check cuando los completa.</p>

        <div className="flex flex-col gap-1.5 mb-3">
          {todos.map((t) => (
            <div key={t.id} className="group flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
              <button onClick={() => post({ op: 'todoToggle', todoId: t.id, hecho: !t.hecho })} className="shrink-0 h-4 w-4 rounded grid place-items-center transition-colors" style={{ border: '1px solid var(--border)', backgroundColor: t.hecho ? 'var(--gold)' : 'transparent' }} aria-label="Completar">
                {t.hecho && <Check size={11} style={{ color: '#000' }} />}
              </button>
              <span className="flex-1 text-sm" style={{ color: t.hecho ? 'var(--muted)' : 'var(--foreground)', textDecoration: t.hecho ? 'line-through' : 'none' }}>{t.texto}</span>
              <button onClick={() => post({ op: 'todoDel', todoId: t.id })} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#ef4444' }} aria-label="Eliminar">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!cargando && todos.length === 0 && <p className="text-xs py-1" style={{ color: 'var(--muted)' }}>Aún no hay objetivos esta semana.</p>}
        </div>

        <div className="flex items-center gap-1.5 rounded-lg px-2" style={{ border: '1px dashed var(--border)' }}>
          <Plus size={14} style={{ color: 'var(--muted)' }} className="shrink-0" />
          <input value={todoDraft} onChange={(e) => setTodoDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }} placeholder="Añadir objetivo (ej. 21 Reels)…" className="flex-1 bg-transparent py-2 text-sm outline-none" style={{ color: 'var(--foreground)' }} />
      </div>
      </div>
    </div>
  )
}
