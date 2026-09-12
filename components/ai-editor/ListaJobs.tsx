'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Film } from 'lucide-react'
import { STATUS_LABEL } from '@/lib/ai-editor/types'
import NuevoVideo from './NuevoVideo'

type Job = { id: string; status: string; progress: number; current_step: string; filename: string; modelo: string; profile: string; created_at: string }
type Modelo = { id: string; nombre: string }

const statusColor = (s: string) => {
  if (s === 'COMPLETED') return '#22C55E'
  if (s === 'REVIEW') return 'var(--gold)'
  if (s === 'FAILED' || s === 'CANCELLED') return '#F87171'
  return '#38BDF8'
}

const ESTADOS = ['UPLOADED', 'QUEUED', 'PREPROCESSING', 'ANALYZING', 'PLANNING', 'RENDERING', 'QUALITY_CHECK', 'REVIEW', 'COMPLETED', 'FAILED', 'CANCELLED']

export default function ListaJobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [fModelo, setFModelo] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [modal, setModal] = useState(false)

  const cargar = useCallback(async () => {
    const p = new URLSearchParams()
    if (fModelo) p.set('modelo_id', fModelo)
    if (fStatus) p.set('status', fStatus)
    try { const r = await fetch('/api/ai-editor/jobs?' + p.toString()); const d = await r.json(); setJobs(d.items ?? []) } catch { setJobs([]) }
  }, [fModelo, fStatus])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { fetch('/api/ai-editor/modelos').then((r) => r.json()).then((d) => setModelos(d.modelos ?? [])).catch(() => {}) }, [])

  const selStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={fModelo} onChange={(e) => setFModelo(e.target.value)} className="text-sm rounded-lg px-2.5 py-1.5 outline-none" style={selStyle}>
          <option value="">Todas las modelos</option>
          {modelos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="text-sm rounded-lg px-2.5 py-1.5 outline-none" style={selStyle}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s as keyof typeof STATUS_LABEL] ?? s}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => setModal(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
          <Plus size={16} /> Nuevo vídeo
        </button>
      </div>

      {jobs === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)' }}>
          <Film size={28} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Todavía no hay vídeos. Pulsa &quot;Nuevo vídeo&quot; para subir el primero.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <Link key={j.id} href={`/ai-editor/${j.id}`}
              className="flex items-center gap-3 rounded-xl p-3 transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>
                <Film size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{j.filename}</p>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{j.modelo} · {j.profile}</p>
              </div>
              <div className="text-right flex-shrink-0" style={{ width: 130 }}>
                <span className="text-xs font-semibold" style={{ color: statusColor(j.status) }}>{STATUS_LABEL[j.status as keyof typeof STATUS_LABEL] ?? j.status}</span>
                <div className="h-1.5 rounded-full overflow-hidden mt-1.5" style={{ backgroundColor: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${j.progress}%`, backgroundColor: statusColor(j.status) }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {modal && <NuevoVideo modelos={modelos} onClose={() => { setModal(false); cargar() }} />}
    </div>
  )
}
