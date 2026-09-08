'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, MoreVertical, Trash2, Plus, ListTodo, Check, X, Upload, BookOpen, Link2, Clock } from 'lucide-react'

interface Tarea { id: string; dia_semana: number; titulo: string }
interface Todo { id: string; texto: string; hecho: boolean; enlace_subir?: string | null; enlace_guia?: string | null }

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const hrefOf = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)

export default function HorarioModelo({ modeloId, editable = true, seccion = 'ambos' }: { modeloId: string; editable?: boolean; seccion?: 'horario' | 'todo' | 'ambos' }) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [cargando, setCargando] = useState(true)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [sel, setSel] = useState<Tarea | null>(null)
  const [todoDraft, setTodoDraft] = useState('')
  const [selTodo, setSelTodo] = useState<Todo | null>(null)
  const [linkSubir, setLinkSubir] = useState('')
  const [linkGuia, setLinkGuia] = useState('')
  const [limDia, setLimDia] = useState(0)
  const [limHora, setLimHora] = useState('16:00')
  const [limGuardado, setLimGuardado] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`/api/modelos/${modeloId}/horario`)
      const d = await r.json()
      setTareas(d.tareas ?? [])
      setTodos(d.todos ?? [])
      setLimDia(d.limite?.dia ?? 0)
      setLimHora(d.limite?.hora ?? '16:00')
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

  function abrirEnlaces(t: Todo) {
    setSelTodo(t)
    setLinkSubir(t.enlace_subir ?? '')
    setLinkGuia(t.enlace_guia ?? '')
  }

  async function guardarLimite(dia: number, hora: string) {
    setLimDia(dia); setLimHora(hora); setLimGuardado(false)
    await post({ op: 'limite', dia, hora })
    setLimGuardado(true); setTimeout(() => setLimGuardado(false), 2000)
  }

  const hechos = todos.filter((t) => t.hecho).length
  const selectStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const
  const verHorario = seccion !== 'todo'
  const verTodo = seccion !== 'horario'

  return (
    <div className="space-y-4">
      {verHorario && (
      <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--gold-25)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-2.5 px-5 py-4" style={{ background: 'linear-gradient(90deg, var(--gold-15), transparent)', borderBottom: '1px solid var(--gold-25)' }}>
          <div className="grid place-items-center h-10 w-10 rounded-xl" style={{ backgroundColor: 'var(--gold-15)' }}>
            <CalendarDays size={20} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--gold)' }}>Horario semanal</h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{editable ? 'Plantilla fija · se repite cada semana' : 'Tus tareas de esta semana'}</p>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {DIAS.map((nombre, dia) => {
              const tDia = tareas.filter((t) => t.dia_semana === dia)
              return (
                <div key={dia} className="rounded-xl flex flex-col" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}>
                  <div className="px-2.5 pt-2.5 pb-2 flex items-center justify-between gap-1">
                    <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{nombre}</span>
                    {tDia.length > 0 && <span className="text-[11px] font-semibold" style={{ color: 'var(--gold)' }}>{tDia.length}</span>}
                  </div>

                  <div className="px-2 flex flex-col gap-1.5 min-h-[16px] pb-2">
                    {tDia.map((t) => (
                      <div key={t.id} className="group rounded-lg px-2 py-1.5 text-xs flex items-start gap-1.5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--gold-25)' }}>
                        <span className="flex-1 leading-snug break-words font-medium" style={{ color: 'var(--gold)' }}>{t.titulo}</span>
                        <button onClick={() => setSel(t)} className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted)' }} aria-label="Opciones">
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    ))}
                    {!editable && tDia.length === 0 && <span className="text-[11px] px-1 pb-1" style={{ color: 'var(--muted)' }}>—</span>}
                  </div>

                  {editable && (
                    <div className="p-2 pt-0">
                      <div className="flex items-center gap-1 rounded-lg px-1.5" style={{ border: '1px dashed var(--gold-25)' }}>
                        <input value={drafts[dia] ?? ''} onChange={(e) => setDrafts((s) => ({ ...s, [dia]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addTarea(dia) }} placeholder="Añadir tarea" className="flex-1 bg-transparent py-1.5 text-xs outline-none" style={{ color: 'var(--foreground)' }} />
                        <button onClick={() => addTarea(dia)} className="shrink-0 grid place-items-center h-6 w-6 rounded-md transition-transform active:scale-90" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }} title="Añadir tarea" aria-label="Añadir tarea">
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      )}

      {verTodo && (
      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-1">
          <ListTodo size={16} style={{ color: 'var(--gold)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--gold)' }}>TO-DO List</h3>
          {todos.length > 0 && <span className="text-xs" style={{ color: 'var(--muted)' }}>{hechos}/{todos.length}</span>}
        </div>
        <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{editable ? 'Objetivos de la semana. La modelo marca el check cuando los completa.' : 'Marca el check cuando completes cada objetivo.'}</p>

        <div className="flex items-center gap-2 flex-wrap mb-3 text-xs" style={{ color: 'var(--muted)' }}>
          <Clock size={13} style={{ color: 'var(--gold)' }} />
          {editable ? (
            <>
              <span>Fecha límite de entrega:</span>
              <select value={limDia} onChange={(e) => guardarLimite(Number(e.target.value), limHora)} className="rounded-lg px-2 py-1 text-xs outline-none" style={selectStyle}>
                {DIAS.map((dn, di) => <option key={di} value={di}>{dn}</option>)}
              </select>
              <input type="time" value={limHora} onChange={(e) => guardarLimite(limDia, e.target.value)} className="rounded-lg px-2 py-1 text-xs outline-none" style={selectStyle} />
              {limGuardado && <span style={{ color: '#22C55E' }}>Guardado ✓</span>}
            </>
          ) : (
            <span>Entrega antes de: <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{DIAS[limDia]} · {limHora}</span></span>
          )}
        </div>

        <div className="flex flex-col gap-2 mb-3">
          {todos.map((t) => (
            <div key={t.id} className="group flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
              <button onClick={() => post({ op: 'todoToggle', todoId: t.id, hecho: !t.hecho })} className="shrink-0 h-5 w-5 rounded grid place-items-center transition-colors" style={{ border: '1px solid var(--border)', backgroundColor: t.hecho ? 'var(--gold)' : 'transparent' }} aria-label="Completar">
                {t.hecho && <Check size={13} style={{ color: '#000' }} />}
              </button>
              <span className="flex-1 text-[15px]" style={{ color: t.hecho ? 'var(--muted)' : 'var(--gold)', textDecoration: t.hecho ? 'line-through' : 'none' }}>{t.texto}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {t.enlace_subir && (
                  <a href={hrefOf(t.enlace_subir)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={{ border: '1px solid var(--gold-25)', color: 'var(--gold)' }}>
                    <Upload size={13} /> Subir
                  </a>
                )}
                {t.enlace_guia && (
                  <a href={hrefOf(t.enlace_guia)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    <BookOpen size={13} /> Guía
                  </a>
                )}
                {editable && (
                  <button onClick={() => abrirEnlaces(t)} className="shrink-0 p-1 transition-opacity hover:opacity-100 opacity-60" style={{ color: 'var(--muted)' }} title="Enlaces (subir / guía)" aria-label="Enlaces">
                    <Link2 size={15} />
                  </button>
                )}
                {editable && (
                  <button onClick={() => post({ op: 'todoDel', todoId: t.id })} className="shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#ef4444' }} aria-label="Eliminar">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {!cargando && todos.length === 0 && <p className="text-xs py-1" style={{ color: 'var(--muted)' }}>Aún no hay objetivos esta semana.</p>}
        </div>

        {editable && (
          <div className="flex items-center gap-1.5 rounded-lg px-2" style={{ border: '1px dashed var(--gold-25)' }}>
            <input value={todoDraft} onChange={(e) => setTodoDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }} placeholder="Añadir objetivo (ej. 21 Reels)…" className="flex-1 bg-transparent py-2 text-sm outline-none" style={{ color: 'var(--foreground)' }} />
            <button onClick={addTodo} className="shrink-0 grid place-items-center h-7 w-7 rounded-md transition-transform active:scale-90" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }} title="Añadir objetivo" aria-label="Añadir objetivo">
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>
      )}

      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setSel(null)}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--gold-25)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Mover tarea</h4>
              <button onClick={() => setSel(null)} style={{ color: 'var(--muted)' }} aria-label="Cerrar"><X size={16} /></button>
            </div>
            <p className="text-sm mb-4 font-medium" style={{ color: 'var(--gold)' }}>{sel.titulo}</p>
            <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Mover a otro día</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {DIAS.map((dn, di) => {
                const aqui = di === sel!.dia_semana
                return (
                  <button key={di} disabled={aqui} onClick={() => { post({ op: 'move', tareaId: sel!.id, dia: di }); setSel(null) }}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-default"
                    style={{ border: `1px solid ${aqui ? 'var(--border)' : 'var(--gold-25)'}`, color: aqui ? 'var(--muted)' : 'var(--gold)', backgroundColor: aqui ? 'var(--background)' : 'transparent' }}>
                    {dn}{aqui ? ' · aquí' : ''}
                  </button>
                )
              })}
            </div>
            {editable && (
              <button onClick={() => { post({ op: 'del', tareaId: sel!.id }); setSel(null) }} className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-opacity hover:opacity-80" style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
                <Trash2 size={14} /> Eliminar tarea
              </button>
            )}
          </div>
        </div>
      )}

      {selTodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setSelTodo(null)}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--gold-25)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Enlaces del objetivo</h4>
              <button onClick={() => setSelTodo(null)} style={{ color: 'var(--muted)' }} aria-label="Cerrar"><X size={16} /></button>
            </div>
            <p className="text-sm mb-4 font-medium" style={{ color: 'var(--gold)' }}>{selTodo.texto}</p>
            <label className="text-xs mb-1 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}><Upload size={12} /> Enlace para subir contenido</label>
            <input value={linkSubir} onChange={(e) => setLinkSubir(e.target.value)} placeholder="https://…" className="w-full rounded-lg px-3 py-2 text-sm mb-3 outline-none" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            <label className="text-xs mb-1 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}><BookOpen size={12} /> Enlace de la guía</label>
            <input value={linkGuia} onChange={(e) => setLinkGuia(e.target.value)} placeholder="https://…" className="w-full rounded-lg px-3 py-2 text-sm mb-4 outline-none" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
            <button onClick={() => { post({ op: 'todoLinks', todoId: selTodo!.id, enlace_subir: linkSubir, enlace_guia: linkGuia }); setSelTodo(null) }} className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold transition-transform active:scale-95" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
              Guardar enlaces
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
