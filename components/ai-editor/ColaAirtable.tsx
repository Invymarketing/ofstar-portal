'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw, Wand2 } from 'lucide-react'

type Task = {
  recordId: string
  modelo: string
  dNum: string
  urgencia: string
  urgenciaRank: number
  fecha: string | null
  sourceUrl: string | null
  sourceFilename: string | null
}

const urgColor = (u: string) =>
  u === 'ATRASADO' ? '#F87171' : u === 'HOY' ? 'var(--gold)' : u === 'MAÑANA' ? '#FBBF24' : '#38BDF8'

function readVideoMeta(url: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    try {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => resolve({ duration: v.duration || 0, width: v.videoWidth || 1080, height: v.videoHeight || 1920 })
      v.onerror = () => resolve({ duration: 0, width: 1080, height: 1920 })
      v.src = url
    } catch {
      resolve({ duration: 0, width: 1080, height: 1920 })
    }
  })
}

export default function ColaAirtable() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [configured, setConfigured] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/ai-editor/airtable-queue')
      const d = await r.json()
      setConfigured(d.configured !== false)
      setTasks(d.tasks ?? [])
      if (d.error) setError(d.error)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function editar(t: Task) {
    const key = t.recordId + t.dNum
    setBusy(key)
    setError(null)
    try {
      const meta = t.sourceUrl ? await readVideoMeta(t.sourceUrl) : { duration: 0, width: 1080, height: 1920 }
      const r = await fetch('/api/ai-editor/airtable-queue/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: t.recordId, dNum: t.dNum, modelo: t.modelo, duration: meta.duration, width: meta.width, height: meta.height }),
      })
      const d = await r.json()
      if (d.job_id) { router.push('/ai-editor/' + d.job_id); return }
      setError(d.error || 'No se pudo crear el trabajo.')
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(null)
  }

  const card = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)' } as const

  if (tasks === null) return <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: 'var(--muted)' }} /></div>

  if (!configured) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ ...card, color: 'var(--muted)' }}>
        Airtable aún no está conectado. Falta la variable AIRTABLE_TOKEN en el servidor.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {tasks.length} vídeo{tasks.length === 1 ? '' : 's'} en cola (por urgencia)
        </p>
        <button onClick={cargar} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ ...card, color: 'var(--foreground)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl p-3 text-[12px]" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171' }}>
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-2xl p-8 text-center text-sm" style={{ ...card, color: 'var(--muted)' }}>
          No hay nada pendiente de editar ahora mismo. 🎉
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={card}>
          {tasks.map((t, i) => {
            const key = t.recordId + t.dNum
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span className="text-xs font-bold rounded-md px-2 py-1 flex-shrink-0" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>{t.dNum}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{t.modelo}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>{t.sourceFilename ?? 'sin vídeo en bruto'}{t.fecha ? ' · ' + t.fecha : ''}</p>
                </div>
                <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 flex-shrink-0 hidden sm:inline" style={{ backgroundColor: 'var(--background)', color: urgColor(t.urgencia), border: '1px solid var(--border)' }}>
                  {t.urgencia}
                </span>
                <button
                  onClick={() => editar(t)}
                  disabled={busy !== null || !t.sourceUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-2 flex-shrink-0 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}
                >
                  {busy === key ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                  Editar
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
        Al pulsar &quot;Editar&quot;, la IA edita ese vídeo con el perfil de la modelo y te lleva a revisarlo. Devolver a Airtable llegará en la siguiente fase.
      </p>
    </div>
  )
}
