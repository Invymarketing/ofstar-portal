'use client'

import { useState, useTransition } from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { executeBotModels } from '@/app/(dashboard)/modulo-1/actions'

interface ExecuteAllButtonProps {
  activeCount: number
}

export default function ExecuteAllButton({ activeCount }: ExecuteAllButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExecuteAll = () => {
    if (activeCount === 0) return
    setError(null)
    startTransition(async () => {
      try {
        await executeBotModels(null)
        setDone(true)
        setTimeout(() => setDone(false), 3000)
      } catch (e: any) {
        setError(e.message ?? 'Error al crear trabajos')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleExecuteAll}
        disabled={isPending || activeCount === 0}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 active:scale-[0.98] hover:opacity-90"
        style={{ backgroundColor: 'var(--gold)', color: 'var(--background)' }}
      >
        {isPending ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Zap size={15} />
        )}
        {done ? '¡Trabajos creados!' : isPending ? 'Creando...' : `Ejecutar todas (${activeCount})`}
      </button>
      {error && (
        <p className="text-[11px]" style={{ color: '#EF4444' }}>{error}</p>
      )}
    </div>
  )
}
