'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trash2, Check, MoreVertical, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface Tarea { id: string; fecha: string; titulo: string; completada: boolean; completada_at: string | null }
interface Todo { id: string; texto: string; hecho: boolean; hecho_at: string | null }

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const addDays = (iso: string, n: number) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10) }
const fmtD = (iso: string) => Number(iso.slice(8, 10))
function lunesActual() { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); const [y, m, d] = p.split('-').map(Number); const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return addDays(p, -((dow + 6) % 7)) }

export default function HorarioModelo({ modeloId }: { modeloId: string }) {
  const [lunes, setLunes] = useState(lunesActual())
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState<Record<string, string>>({})
  const [nuevoTodo, setNuevoTodo] = useState('')
  const [menu, setMenu] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/modelos/${modeloId}/horario?lunes=${lunes}`)
      const d = await r.json()
      setTareas(d.tareas ?? []); setTodos(d.todos ?? [])
    } catch { setTareas([]); setTodos([]) }
    setLoading(false)
  }, [modeloId, lunes])
  useEffect(() => { cargar() }, [cargar])

  async function op(body: Record<string, unknown>) {
    await fetch(`/api/modelos/${modeloId}/horario`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setMenu(null); cargar()
  }

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(lunes, i)), [lunes])
  const card = { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' } as const
  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  return (
    <div className="rounded-2xl border p-4 mb-4" style={card}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Horario semanal</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setLunes(addDays(lunes, -7))} className="p-1.5 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}><ChevronLeft size={14} /></button>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{fmtD(lunes)}–{fmtD(addDays(lunes, 6))}</span>
          <button onClick={() => setLunes(addDays(lunes, 7))} className="p-1.5 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}><ChevronRight size={14} /></button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {dias.map((f, i) => {
            const lista = tareas.filter((t) => t.fecha === f)
            const hechas = lista.filter((t) => t.completada).length
            return (
              <div key={f} className="rounded-xl p-2" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--foreground)' }}>{DIAS[i]} {fmtD(f)}</span>
                  <span className="text-[10px]" style={{ color: lista.length > 0 && hechas === lista.length ? '#4ADE80' : 'var(--muted)' }}>{hechas}/{lista.length}</span>
                </div>
                <div className="space-y-1">
                  {lista.map((t) => (
                    <div key={t.id} className="rounded-lg px-2 py-1.5 text-[11px] flex items-start gap-1.5 relative" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <button onClick={() => op({ op: 'toggle', tareaId: t.id, completada: !t.completada })} className="flex-shrink-0 mt-0.5 w-3.5 h-3.5 rounded flex items-center justify-center" style={{ border: `1px solid ${t.completada ? '#4ADE80' : 'var(--border)'}`, backgroundColor: t.completada ? '#4ADE80' : 'transparent' }}>{t.completada && <Check size={9} color="#0D0D14" />}</button>
                      <span className="flex-1 min-w-0 break-words" style={{ color: t.completada ? 'var(--muted)' : 'var(--foreground)', textDecoration: t.completada ? 'line-through' : 'none' }}>{t.titulo}</span>
                      <button onClick={() => setMenu(menu === t.id ? null : t.id)} style={{ color: 'var(--muted)' }}><MoreVertical size={12} /></button>
                      {menu === t.id && (
                        <div className="absolute right-1 top-6 z-30 rounded-lg border p-1 shadow-xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', minWidth: 130 }}>
                          <p className="text-[9px] px-2 py-0.5" style={{ color: 'var(--muted)' }}>Mover a…</p>
                          {dias.map((f2, j) => (f2 !== f ? (<button key={f2} onClick={() => op({ op: 'move', tareaId: t.id, fecha: f2 })} className="block w-full text-left text-[11px] px-2 py-1 rounded" style={{ color: 'var(--foreground)' }}>{DIAS[j]} {fmtD(f2)}</button>) : null))}
                          <button onClick={() => op({ op: 'del', tareaId: t.id })} className="block w-full text-left text-[11px] px-2 py-1 rounded mt-1" style={{ color: '#F87171', borderTop: '1px solid var(--border)' }}>Eliminar</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); const v = (nuevo[f] || '').trim(); if (v) { op({ op: 'add', fecha: f, titulo: v }); setNuevo((p) => ({ ...p, [f]: '' })) } }} className="mt-1.5">
                  <input value={nuevo[f] || ''} onChange={(e) => setNuevo((p) => ({ ...p, [f]: e.target.value }))} placeholder="+ tarea" className="w-full rounded-lg px-2 py-1 text-[11px]" style={inputStyle} />
                </form>
              </div>
            )
          })}
        </div>
      )}
      <div className="mt-4">
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>To-do list</p>
        <div className="space-y-1.5">
          {todos.map((td) => (
            <div key={td.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
              <button onClick={() => op({ op: 'todoToggle', todoId: td.id, hecho: !td.hecho })} className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center" style={{ border: `1px solid ${td.hecho ? '#4ADE80' : 'var(--border)'}`, backgroundColor: td.hecho ? '#4ADE80' : 'transparent' }}>{td.hecho && <Check size={11} color="#0D0D14" />}</button>
              <span className="flex-1 min-w-0 break-words" style={{ color: td.hecho ? 'var(--muted)' : 'var(--foreground)', textDecoration: td.hecho ? 'line-through' : 'none' }}>{td.texto}</span>
              <button onClick={() => op({ op: 'todoDel', todoId: td.id })} style={{ color: 'var(--muted)' }}><Trash2 size={13} /></button>
            </div>
          ))}
          {todos.length === 0 && <p className="text-xs" style={{ color: 'var(--muted)' }}>Sin tareas en el to-do.</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const v = nuevoTodo.trim(); if (v) { op({ op: 'todoAdd', texto: v }); setNuevoTodo('') } }} className="mt-2">
          <input value={nuevoTodo} onChange={(e) => setNuevoTodo(e.target.value)} placeholder="+ Añadir al to-do" className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
        </form>
      </div>
    </div>
  )
}
