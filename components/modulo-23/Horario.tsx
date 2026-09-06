'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addTarea, delTarea, toggleTarea, moverTarea } from '@/app/(dashboard)/modulo-23/actions'
import { Trash2, Check, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'

interface Tarea { id: string; profile_id: string; fecha: string; titulo: string; completada: boolean; completada_at: string | null }
interface Modelo { id: string; full_name: string }
interface Props { esManager: boolean; selPid: string; modelos: Modelo[]; lunes: string; tareas: Tarea[] }

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const addDays = (iso: string, n: number) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10) }
const fmtDia = (iso: string) => Number(iso.slice(8, 10))

export default function Horario({ esManager, selPid, modelos, lunes, tareas }: Props) {
  const router = useRouter()
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(lunes, i)), [lunes])
  const porDia = (f: string) => tareas.filter((t) => t.fecha === f)
  const [nuevo, setNuevo] = useState<Record<string, string>>({})
  const [menu, setMenu] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function accion(fn: () => Promise<void>) {
    setBusy(true)
    try { await fn(); router.refresh() } finally { setBusy(false); setMenu(null) }
  }
  async function agregar(f: string) {
    const v = (nuevo[f] || '').trim()
    if (!v) return
    setBusy(true)
    try { await addTarea(selPid, f, v); setNuevo((p) => ({ ...p, [f]: '' })); router.refresh() } finally { setBusy(false) }
  }
  const irSemana = (n: number) => router.push(`/modulo-23?lunes=${addDays(lunes, n * 7)}${esManager ? `&modelo=${selPid}` : ''}`)

  const card = { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' } as const
  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {esManager ? (
          <select value={selPid} onChange={(e) => router.push(`/modulo-23?lunes=${lunes}&modelo=${e.target.value}`)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle}>
            {modelos.length === 0 && <option value="">No hay modelos</option>}
            {modelos.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        ) : <span />}
        <div className="flex items-center gap-3">
          <button onClick={() => irSemana(-1)} className="p-2 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}><ChevronLeft size={16} /></button>
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Semana {fmtDia(lunes)} – {fmtDia(addDays(lunes, 6))}</span>
          <button onClick={() => irSemana(1)} className="p-2 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}><ChevronRight size={16} /></button>
        </div>
      </div>

      {esManager && !selPid ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No hay usuarios con rol Modelo todavía. Crea uno en Empleados/Usuarios.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {dias.map((f, i) => {
            const lista = porDia(f)
            const hechas = lista.filter((t) => t.completada).length
            return (
              <div key={f} className="rounded-2xl border p-3" style={card}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{DIAS[i]} {fmtDia(f)}</span>
                  <span className="text-[11px]" style={{ color: lista.length > 0 && hechas === lista.length ? '#4ADE80' : 'var(--muted)' }}>{hechas}/{lista.length}</span>
                </div>
                <div className="space-y-1.5">
                  {lista.map((t) => (
                    <div key={t.id} className="rounded-lg px-2.5 py-2 text-sm flex items-start gap-2 relative" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                      <button onClick={() => accion(() => toggleTarea(t.id, !t.completada))} disabled={busy} className="flex-shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center"
                        style={{ border: `1px solid ${t.completada ? '#4ADE80' : 'var(--border)'}`, backgroundColor: t.completada ? '#4ADE80' : 'transparent' }}>
                        {t.completada && <Check size={11} color="#0D0D14" />}
                      </button>
                      <span className="flex-1 min-w-0 break-words" style={{ color: t.completada ? 'var(--muted)' : 'var(--foreground)', textDecoration: t.completada ? 'line-through' : 'none' }}>{t.titulo}</span>
                      <button onClick={() => setMenu(menu === t.id ? null : t.id)} className="flex-shrink-0" style={{ color: 'var(--muted)' }}><MoreVertical size={14} /></button>
                      {menu === t.id && (
                        <div className="absolute right-1 top-8 z-20 rounded-lg border p-1 shadow-xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', minWidth: 150 }}>
                          <p className="text-[10px] px-2 py-1" style={{ color: 'var(--muted)' }}>Mover a…</p>
                          {dias.map((f2, j) => (f2 !== f ? (
                            <button key={f2} onClick={() => accion(() => moverTarea(t.id, f2))} className="block w-full text-left text-xs px-2 py-1.5 rounded hover:opacity-80" style={{ color: 'var(--foreground)' }}>{DIAS[j]} {fmtDia(f2)}</button>
                          ) : null))}
                          {esManager && (
                            <button onClick={() => accion(() => delTarea(t.id))} className="w-full text-left text-xs px-2 py-1.5 rounded mt-1" style={{ color: '#F87171', borderTop: '1px solid var(--border)' }}>
                              <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Eliminar</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {lista.length === 0 && <p className="text-[11px] text-center py-2" style={{ color: 'var(--muted)' }}>—</p>}
                </div>
                {esManager && (
                  <form onSubmit={(e) => { e.preventDefault(); agregar(f) }} className="mt-2">
                    <input value={nuevo[f] || ''} onChange={(e) => setNuevo((p) => ({ ...p, [f]: e.target.value }))} placeholder="+ Añadir tarea" className="w-full rounded-lg px-2.5 py-1.5 text-xs" style={inputStyle} />
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
