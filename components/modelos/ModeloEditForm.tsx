'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink, Save, CheckCircle2 } from 'lucide-react'

interface ModeloEditFormProps {
  modelo: {
    id: string
    full_name: string
    content_snare_url: string | null
    notion_url: string | null
  }
}

export default function ModeloEditForm({ modelo }: ModeloEditFormProps) {
  const [contentSnareUrl, setContentSnareUrl] = useState(modelo.content_snare_url ?? '')
  const [notionUrl, setNotionUrl] = useState(modelo.notion_url ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        content_snare_url: contentSnareUrl.trim() || null,
        notion_url: notionUrl.trim() || null,
      })
      .eq('id', modelo.id)

    setSaving(false)

    if (updateError) {
      setError('Error al guardar: ' + updateError.message)
      return
    }

    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSave}>
      <div
        className="rounded-2xl border p-6 space-y-6"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
            Enlaces de acceso rápido
          </h2>
          <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
            La modelo verá estos botones en su panel personal. Puedes dejar un campo vacío si el enlace aún no existe.
          </p>

          {/* Content Snare URL */}
          <div className="space-y-2 mb-5">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Plantilla OF — Content Snare
            </label>
            <div className="relative">
              <input
                type="url"
                value={contentSnareUrl}
                onChange={(e) => setContentSnareUrl(e.target.value)}
                placeholder="https://app.contentsnare.com/..."
                className="w-full rounded-xl px-4 py-3 text-sm pr-10 focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              {contentSnareUrl && (
                <a
                  href={contentSnareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--muted)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          {/* Notion URL */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              TO-DO Marketing — Notion
            </label>
            <div className="relative">
              <input
                type="url"
                value={notionUrl}
                onChange={(e) => setNotionUrl(e.target.value)}
                placeholder="https://notion.so/..."
                className="w-full rounded-xl px-4 py-3 text-sm pr-10 focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              {notionUrl && (
                <a
                  href={notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--muted)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 active:scale-[0.98]"
          style={{ backgroundColor: 'var(--gold)', color: 'var(--background)' }}
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              Guardando...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 size={16} />
              Guardado
            </>
          ) : (
            <>
              <Save size={16} />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </form>
  )
}
