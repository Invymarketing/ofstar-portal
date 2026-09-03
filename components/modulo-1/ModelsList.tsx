'use client'

import { useState, useTransition } from 'react'
import { Play, Pause, Trash2, ExternalLink, AtSign, Loader2 } from 'lucide-react'
import { toggleBotModel, deleteBotModel, executeBotModels } from '@/app/(dashboard)/modulo-1/actions'

export interface BotModel {
  id: string
  model_name: string
  instagram_handle: string
  notion_page_url: string | null
  is_active: boolean
  created_at: string
}

interface ModelsListProps {
  models: BotModel[]
}

export default function ModelsList({ models: initialModels }: ModelsListProps) {
  const [models, setModels] = useState(initialModels)
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = (id: string, current: boolean) => {
    setLoadingId(id)
    setError(null)
    // Optimistic update
    setModels((prev) => prev.map((m) => m.id === id ? { ...m, is_active: !current } : m))
    startTransition(async () => {
      try {
        await toggleBotModel(id, !current)
      } catch (e) {
        setModels((prev) => prev.map((m) => m.id === id ? { ...m, is_active: current } : m))
        setError('Error al actualizar el estado')
      } finally {
        setLoadingId(null)
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}" de la automatización? Esto no afecta la Chrome Extension.`)) return
    setLoadingId(`del-${id}`)
    setError(null)
    startTransition(async () => {
      try {
        await deleteBotModel(id)
        setModels((prev) => prev.filter((m) => m.id !== id))
      } catch (e) {
        setError('Error al eliminar la modelo')
      } finally {
        setLoadingId(null)
      }
    })
  }

  const handleExecute = (modelId: string) => {
    setLoadingId(`exe-${modelId}`)
    setError(null)
    startTransition(async () => {
      try {
        await executeBotModels(modelId)
      } catch (e: any) {
        setError(e.message ?? 'Error al crear el trabajo')
      } finally {
        setLoadingId(null)
      }
    })
  }

  if (models.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed p-10 text-center"
        style={{ borderColor: 'var(--border)' }}
      >
        <AtSign size={28} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>
          Sin modelos en la automatización
        </p>
        <p className="text-xs" style={{ color: 'rgba(107,107,128,0.6)' }}>
          Añade la primera modelo con el formulario de abajo
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-xs px-4 py-2.5 rounded-xl mb-3" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}
      {models.map((model) => (
        <div
          key={model.id}
          className="flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: model.is_active ? 'var(--gold-15)' : 'var(--border)',
          }}
        >
          {/* Status dot */}
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 transition-colors"
            style={{ backgroundColor: model.is_active ? '#22C55E' : 'var(--muted)' }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
              {model.model_name}
            </p>
            <a
              href={`https://instagram.com/${model.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              @{model.instagram_handle}
            </a>
          </div>

          {/* Notion link */}
          {model.notion_page_url ? (
            <a
              href={model.notion_page_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir página de Notion"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0 hover:opacity-80"
              style={{ backgroundColor: 'var(--border)', color: 'var(--muted)' }}
            >
              <ExternalLink size={11} />
              Notion
            </a>
          ) : (
            <span className="text-xs flex-shrink-0" style={{ color: 'rgba(107,107,128,0.4)' }}>
              Sin Notion
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Execute */}
            <button
              onClick={() => handleExecute(model.id)}
              disabled={!model.is_active || loadingId === `exe-${model.id}`}
              title="Crear trabajo de ejecución"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 hover:opacity-80 active:scale-95"
              style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}
            >
              {loadingId === `exe-${model.id}` ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={13} />
              )}
            </button>

            {/* Toggle pause/resume */}
            <button
              onClick={() => handleToggle(model.id, model.is_active)}
              disabled={loadingId === model.id}
              title={model.is_active ? 'Pausar' : 'Activar'}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 hover:opacity-80 active:scale-95"
              style={{ backgroundColor: 'var(--border)', color: 'var(--muted)' }}
            >
              {loadingId === model.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : model.is_active ? (
                <Pause size={13} />
              ) : (
                <Play size={13} />
              )}
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDelete(model.id, model.model_name)}
              disabled={loadingId === `del-${model.id}`}
              title="Eliminar del portal"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 hover:opacity-80 active:scale-95"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
            >
              {loadingId === `del-${model.id}` ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
