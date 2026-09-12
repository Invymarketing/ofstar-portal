'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles, RotateCcw, Check, X, Clapperboard } from 'lucide-react'
import { STATUS_LABEL } from '@/lib/ai-editor/types'

type LogLine = { t: string; msg: string }
type JobDetail = {
  job: { id: string; status: string; progress: number; current_step: string; custom_instructions: string; logs: LogLine[]; edit_plan: unknown }
  asset: { filename: string; signedUrl: string | null } | null
  modelo: string
  profile: { id: string; name: string; custom_instructions: string } | null
}

const PROCESANDO = ['QUEUED', 'PREPROCESSING', 'ANALYZING', 'PLANNING', 'RENDERING', 'QUALITY_CHECK']

const statusColor = (s: string) => {
  if (s === 'COMPLETED') return '#22C55E'
  if (s === 'REVIEW') return 'var(--gold)'
  if (s === 'FAILED' || s === 'CANCELLED') return '#F87171'
  return '#38BDF8'
}

const QUICK = ['Cambiar gancho', 'Más rápido', 'Más lento', 'Menos zoom', 'Más zoom', 'Sin subtítulos', 'Otro inicio']

export default function JobEditor({ jobId }: { jobId: string }) {
  const [data, setData] = useState<JobDetail | null>(null)
  const [vista, setVista] = useState<'original' | 'ai'>('original')

  const cargar = useCallback(async () => {
    try { const r = await fetch(`/api/ai-editor/jobs/${jobId}`); const d = await r.json(); setData(d) } catch { /* noop */ }
  }, [jobId])
  useEffect(() => { cargar() }, [cargar])

  // Avance simulado del pipeline (FASE 1): un paso cada ~1.4s hasta REVIEW
  useEffect(() => {
    if (!data) return
    if (!PROCESANDO.includes(data.job.status)) return
    const t = setTimeout(async () => {
      await fetch(`/api/ai-editor/jobs/${jobId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'advance' }) })
      cargar()
    }, 1400)
    return () => clearTimeout(t)
  }, [data, jobId, cargar])

  async function accion(action: string) {
    await fetch(`/api/ai-editor/jobs/${jobId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    cargar()
  }

  if (!data || !data.job) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" style={{ color: 'var(--muted)' }} /></div>

  const { job, asset, modelo, profile } = data
  const enProceso = PROCESANDO.includes(job.status)
  const enReview = job.status === 'REVIEW'
  const completado = job.status === 'COMPLETED'
  const card = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)' } as const

  return (
    <div className="space-y-5">
      <Link href="/ai-editor" className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg" style={{ color: 'var(--muted)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <ArrowLeft size={14} /> Volver al editor
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>
          <Clapperboard size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ color: 'var(--foreground)' }}>{asset?.filename ?? 'Vídeo'}</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{modelo} · {profile?.name ?? 'Sin perfil'}</p>
        </div>
        <span className="text-xs font-semibold rounded-full px-3 py-1" style={{ backgroundColor: 'var(--gold-15)', color: statusColor(job.status) }}>
          {STATUS_LABEL[job.status as keyof typeof STATUS_LABEL] ?? job.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-4 items-start">
        {/* Preview + timeline */}
        <div className="space-y-3">
          {(enReview || completado) && (
            <div className="flex gap-2">
              {(['original', 'ai'] as const).map((v) => (
                <button key={v} onClick={() => setVista(v)} className="rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: vista === v ? 'var(--gold-15)' : 'transparent', color: vista === v ? 'var(--gold)' : 'var(--muted)', border: `1px solid ${vista === v ? 'var(--gold-25)' : 'var(--border)'}` }}>
                  {v === 'original' ? 'Original' : 'AI Edit'}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-2xl overflow-hidden flex items-center justify-center" style={{ ...card, aspectRatio: '9 / 16', maxHeight: 480, margin: '0 auto', width: '100%' }}>
            {vista === 'ai' && (enReview || completado) ? (
              <div className="text-center px-6">
                <Sparkles size={26} style={{ color: 'var(--gold)', margin: '0 auto 8px' }} />
                <p className="text-xs" style={{ color: 'var(--muted)' }}>El vídeo editado aparecerá aquí cuando conectemos el motor de render (FASE 2).</p>
              </div>
            ) : asset?.signedUrl ? (
              <video src={asset.signedUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }} />
            ) : (
              <p className="text-xs px-6 text-center" style={{ color: 'var(--muted)' }}>No se pudo cargar el vídeo.</p>
            )}
          </div>

          {/* Timeline simple */}
          <div className="rounded-2xl p-3" style={card}>
            <p className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>Timeline</p>
            <div className="h-8 rounded-lg relative overflow-hidden" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
              <div className="absolute inset-y-0 left-0" style={{ width: `${job.progress}%`, backgroundColor: 'var(--gold-15)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Los cortes se mostrarán aquí al conectar el motor (FASE 2)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="space-y-3">
          <div className="rounded-2xl p-4 space-y-2" style={card}>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Modelo</p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{modelo}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Editing Profile</p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{profile?.name ?? 'Sin perfil'}</p>
            </div>
            {job.custom_instructions && (
              <div>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Instrucciones de este vídeo</p>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>{job.custom_instructions}</p>
              </div>
            )}
          </div>

          {/* Acciones según estado */}
          {job.status === 'UPLOADED' && (
            <button onClick={() => accion('generate')} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
              <Sparkles size={16} /> Generate AI Edit
            </button>
          )}

          {enProceso && (
            <div className="rounded-2xl p-4" style={card}>
              <div className="flex items-center gap-2 mb-2">
                <Loader2 size={15} className="animate-spin" style={{ color: 'var(--gold)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{job.current_step || 'Procesando…'}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${job.progress}%`, backgroundColor: 'var(--gold)' }} />
              </div>
            </div>
          )}

          {enReview && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button onClick={() => accion('approve')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold" style={{ backgroundColor: '#22C55E', color: '#04120a' }}>
                  <Check size={15} /> Aprobar
                </button>
                <button onClick={() => accion('reject')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }}>
                  <X size={15} /> Rechazar
                </button>
              </div>
              <button onClick={() => accion('regenerate')} className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                <RotateCcw size={14} /> Regenerar
              </button>
              <div className="rounded-2xl p-3" style={card}>
                <p className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>Ajustes rápidos (FASE 2)</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK.map((q) => (
                    <span key={q} className="text-[11px] rounded-lg px-2.5 py-1" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted)' }}>{q}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {completado && (
            <button onClick={() => accion('regenerate')} className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              <RotateCcw size={14} /> Regenerar
            </button>
          )}

          {(job.status === 'CANCELLED' || job.status === 'FAILED') && (
            <button onClick={() => accion('regenerate')} className="w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
              <RotateCcw size={14} /> Reintentar
            </button>
          )}

          {/* Log */}
          {Array.isArray(job.logs) && job.logs.length > 0 && (
            <div className="rounded-2xl p-3" style={card}>
              <p className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>Registro</p>
              <div className="space-y-1">
                {job.logs.slice(-8).map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span style={{ color: 'var(--muted)' }}>{new Date(l.t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span style={{ color: 'var(--foreground)' }}>{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
