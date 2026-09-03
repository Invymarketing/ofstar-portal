'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Upload, Download, X, Loader2 } from 'lucide-react'

interface Variante { url: string; filename: string }

export default function MetadataTool() {
  const supabase = createClient()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [versiones, setVersiones] = useState(3)
  const [cargando, setCargando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [fallos, setFallos] = useState<string[]>([])

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  async function generar() {
    if (!archivo) { setError('Elige un archivo primero'); return }
    setError(null); setVariantes([]); setFallos([])
    try {
      // 1) Subir el archivo a Storage para tener una URL pública
      setCargando('Subiendo archivo…')
      const safe = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '')
      const path = `metadata/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from('pruebas').upload(path, archivo, { upsert: false })
      if (upErr) throw new Error('No se pudo subir: ' + upErr.message)
      const fileUrl = supabase.storage.from('pruebas').getPublicUrl(path).data.publicUrl

      // 2) Pedir las N variantes al motor
      setCargando(`Generando ${versiones} versión(es)…`)
      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileUrl, n: versiones }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Error del motor')
      setVariantes(j.variantes ?? [])
      setFallos(j.fallos ?? [])
      if ((j.variantes ?? []).length === 0) setError('El motor no devolvió variantes. Revisa el archivo o inténtalo de nuevo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setCargando(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        {/* Archivo */}
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Archivo (imagen o video)</label>
        {archivo ? (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm mb-4" style={inputStyle}>
            <span className="truncate flex-1" style={{ color: 'var(--foreground)' }}>{archivo.name}</span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{(archivo.size / 1024 / 1024).toFixed(1)} MB</span>
            <button onClick={() => setArchivo(null)} style={{ color: '#EF4444' }}><X size={15} /></button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 rounded-lg px-3 py-6 text-sm cursor-pointer mb-4 border border-dashed"
            style={{ backgroundColor: '#0D0D14', borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <Upload size={16} /> Elegir imagen o video
            <input type="file" accept="image/*,video/*" className="hidden"
              onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setVariantes([]); setError(null) }} />
          </label>
        )}

        {/* Nº de versiones */}
        <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>¿Cuántas versiones? (1–12)</label>
        <div className="flex items-center gap-3 mb-4">
          <input type="range" min={1} max={12} value={versiones}
            onChange={(e) => setVersiones(Number(e.target.value))} className="flex-1" />
          <span className="text-lg font-bold w-8 text-center" style={{ color: 'var(--gold)' }}>{versiones}</span>
        </div>

        <button onClick={generar} disabled={!!cargando}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
          {cargando ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {cargando ?? 'Generar versiones'}
        </button>
        {error && <p className="text-xs mt-3" style={{ color: '#EF4444' }}>{error}</p>}
      </div>

      {/* Resultados */}
      {variantes.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
            {variantes.length} versión(es) lista(s) — descárgalas
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {variantes.map((v, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm truncate" style={{ color: 'var(--foreground)' }}>Versión {i + 1} · {v.filename}</span>
                <a href={v.url} target="_blank" rel="noopener noreferrer" download
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: 'var(--border)', color: 'var(--gold)' }}>
                  <Download size={13} /> Descargar
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {fallos.length > 0 && (
        <p className="text-[11px]" style={{ color: '#EAB308' }}>Fallaron {fallos.length}: {fallos.join(' · ')}</p>
      )}
    </div>
  )
}
