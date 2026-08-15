'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, Clock, Loader2, ChevronDown, Trash2 } from 'lucide-react'
import { completeExecution, deleteExecution } from '@/app/(dashboard)/modulo-1/actions'

export interface BotExecution {
  id: string
  model_name: string
  instagram_handle: string
  status: 'pending' | 'running' | 'success' | 'error'
  reels_found: number | null
  notes: string | null
  triggered_at: string
  completed_at: string | null
}

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#EAB308', bg: 'rgba(234,179,8,0.1)', icon: Clock },
  running: { label: 'Ejecutando', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: Loader2 },
  success: { label: 'Completado', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', icon: CheckCircle2 },
  error: { label: 'Error', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle },
}

interface CompleteFormProps {
  executionId: string
  onClose: () => void
}

function CompleteForm({ executionId, onClose }: CompleteFormProps) {
  const [status, setStatus] = useState<'success' | 'error'>('success')
  const [reelsFound, setReelsFound] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      await completeExecution(executionId, {
        status,
        reels_found: reelsFound ? parseInt(reelsFound) : undefined,
        notes,
      })
      onClose()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 pt-3" style={{ borderTop: '1px solid #1E1E2E' }}>
      <div className="flex gap-2">
        {(['success', 'error'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: status === s
                ? (s === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)')
                : '#1E1E2E',
              color: status === s
                ? (s === 'success' ? '#22C55E' : '#EF4444')
                : '#6B6B80',
              border: `1px solid ${status === s
                ? (s === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)')
                : 'transparent'}`,
            }}
          >
            {s === 'success' ? '✓ Éxito' : '✗ Error'}
          </button>
        ))}
      </div>

      {status === 'success' && (
        <input
          type="number"
          min="0"
          value={reelsFound}
          onChange={(e) => setReelsFound(e.target.value)}
          placeholder="Reels encontrados"
          className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none"
          style={{ backgroundColor: '#0A0A0F', border: '1px solid #1E1E2E', color: '#F0F0F5' }}
        />
      )}

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas opcionales"
        className="w-full rounded-lg px-3 py-2 text-xs focus:outline-none"
        style={{ backgroundColor: '#0A0A0F', border: '1px solid #1E1E2E', color: '#F0F0F5' }}
      />

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-xs" style={{ backgroundColor: '#1E1E2E', color: '#6B6B80' }}>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: '#C9A84C', color: '#0A0A0F' }}
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
          Guardar
        </button>
      </div>
    </form>
  )
}

interface ExecutionRowProps {
  exec: BotExecution
}

function ExecutionRow({ exec }: ExecutionRowProps) {
  const [completing, setCompleting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const cfg = STATUS_CONFIG[exec.status]
  const Icon = cfg.icon

  const handleDelete = () => {
    if (!confirm('¿Eliminar esta entrada del log?')) return
    startTransition(() => deleteExecution(exec.id))
  }

  const date = new Date(exec.triggered_at).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="px-5 py-3.5 rounded-xl border" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
      <div className="flex items-center gap-3">
        {/* Status badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          <Icon size={10} className={exec.status === 'running' ? 'animate-spin' : ''} />
          {cfg.label}
        </div>

        {/* Model */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium" style={{ color: '#F0F0F5' }}>{exec.model_name}</span>
          <span className="text-xs ml-2" style={{ color: '#6B6B80' }}>@{exec.instagram_handle}</span>
        </div>

        {/* Reels count */}
        {exec.reels_found !== null && (
          <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#C9A84C' }}>
            {exec.reels_found} reels
          </span>
        )}

        {/* Date */}
        <span className="text-xs flex-shrink-0 hidden sm:block" style={{ color: '#6B6B80' }}>{date}</span>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {exec.status === 'pending' && (
            <button
              onClick={() => setCompleting(!completing)}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ backgroundColor: '#1E1E2E', color: '#F0F0F5' }}
            >
              Completar
              <ChevronDown size={11} className={completing ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: '#6B6B80' }}
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>

      {/* Notes */}
      {exec.notes && (
        <p className="mt-1.5 text-xs pl-1" style={{ color: '#6B6B80' }}>{exec.notes}</p>
      )}

      {/* Complete form */}
      {completing && (
        <CompleteForm executionId={exec.id} onClose={() => setCompleting(false)} />
      )}
    </div>
  )
}

interface ExecutionLogProps {
  executions: BotExecution[]
}

export default function ExecutionLog({ executions }: ExecutionLogProps) {
  if (executions.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed py-8 text-center"
        style={{ borderColor: '#1E1E2E' }}
      >
        <p className="text-sm" style={{ color: '#6B6B80' }}>
          Sin ejecuciones registradas aún
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {executions.map((exec) => (
        <ExecutionRow key={exec.id} exec={exec} />
      ))}
    </div>
  )
}
