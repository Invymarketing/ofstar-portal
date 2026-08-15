'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { addBotModel } from '@/app/(dashboard)/modulo-1/actions'

export default function AddModelForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ model_name: '', instagram_handle: '', notion_page_url: '' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await addBotModel(form)
        setForm({ model_name: '', instagram_handle: '', notion_page_url: '' })
        setOpen(false)
      } catch (err: any) {
        setError(err.message ?? 'Error al añadir la modelo')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed text-sm transition-all hover:opacity-80"
        style={{ borderColor: '#1E1E2E', color: '#6B6B80' }}
      >
        <Plus size={15} />
        Añadir modelo a la automatización
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-2xl border p-5"
      style={{ backgroundColor: '#13131A', borderColor: 'rgba(201,168,76,0.2)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>Nueva modelo</p>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="hover:opacity-70 transition-opacity"
          style={{ color: '#6B6B80' }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#6B6B80' }}>
            Nombre *
          </label>
          <input
            type="text"
            value={form.model_name}
            onChange={(e) => setForm({ ...form, model_name: e.target.value })}
            placeholder="Aina"
            required
            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: '#0A0A0F', border: '1px solid #1E1E2E', color: '#F0F0F5' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
            onBlur={(e) => (e.target.style.borderColor = '#1E1E2E')}
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#6B6B80' }}>
            Instagram *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B6B80' }}>@</span>
            <input
              type="text"
              value={form.instagram_handle}
              onChange={(e) => setForm({ ...form, instagram_handle: e.target.value.replace(/^@/, '') })}
              placeholder="handle_de_instagram"
              required
              className="w-full rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none transition-colors"
              style={{ backgroundColor: '#0A0A0F', border: '1px solid #1E1E2E', color: '#F0F0F5' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = '#1E1E2E')}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: '#6B6B80' }}>
            Página de Notion (captions)
          </label>
          <input
            type="url"
            value={form.notion_page_url}
            onChange={(e) => setForm({ ...form, notion_page_url: e.target.value })}
            placeholder="https://notion.so/..."
            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: '#0A0A0F', border: '1px solid #1E1E2E', color: '#F0F0F5' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
            onBlur={(e) => (e.target.style.borderColor = '#1E1E2E')}
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
          {error}
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="flex-1 py-2.5 rounded-xl text-sm transition-all hover:opacity-80"
          style={{ backgroundColor: '#1E1E2E', color: '#6B6B80' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 active:scale-[0.98]"
          style={{ backgroundColor: '#C9A84C', color: '#0A0A0F' }}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {isPending ? 'Añadiendo...' : 'Añadir'}
        </button>
      </div>
    </form>
  )
}
