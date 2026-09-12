'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X, UploadCloud } from 'lucide-react'

type Modelo = { id: string; nombre: string }
type Profile = { id: string; name: string }

export default function NuevoVideo({ modelos, onClose }: { modelos: Modelo[]; onClose: () => void }) {
  const router = useRouter()
  const [modeloId, setModeloId] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profileId, setProfileId] = useState('')
  const [instr, setInstr] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!modeloId) { setProfiles([]); setProfileId(''); return }
    fetch('/api/ai-editor/editing-profiles?modelo_id=' + modeloId).then((r) => r.json()).then((d) => {
      const items: Profile[] = (d.items ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
      setProfiles(items); setProfileId(items[0]?.id ?? '')
    }).catch(() => setProfiles([]))
  }, [modeloId])

  async function subir() {
    setError('')
    if (!file) { setError('Elige un vídeo (MP4 o MOV).'); return }
    setSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (modeloId) fd.append('modelo_id', modeloId)
      const up = await fetch('/api/ai-editor/upload', { method: 'POST', body: fd })
      const upd = await up.json()
      if (!up.ok) { setError(upd.error || 'Error al subir el vídeo.'); setSubiendo(false); return }
      const jb = await fetch('/api/ai-editor/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ video_asset_id: upd.asset_id, modelo_id: modeloId || null, editing_profile_id: profileId || null, custom_instructions: instr }) })
      const jbd = await jb.json()
      if (!jb.ok) { setError(jbd.error || 'Error al crear el trabajo.'); setSubiendo(false); return }
      router.push('/ai-editor/' + jbd.job_id)
    } catch (e) { setError((e as Error).message); setSubiendo(false) }
  }

  const selStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Nuevo vídeo</h3>
          <button onClick={onClose} style={{ color: 'var(--muted)' }} aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Modelo</label>
            <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} className="w-full text-sm rounded-lg px-3 py-2 outline-none" style={selStyle}>
              <option value="">Sin modelo</option>
              {modelos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Editing Profile</label>
            <select value={profileId} onChange={(e) => setProfileId(e.target.value)} disabled={!modeloId} className="w-full text-sm rounded-lg px-3 py-2 outline-none disabled:opacity-50" style={selStyle}>
              {profiles.length === 0 ? <option value="">— sin perfiles —</option> : profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {modeloId && profiles.length === 0 && <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>Esta modelo no tiene perfiles. Créale uno en la pestaña Editing Profiles.</p>}
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Instrucciones para este vídeo (opcional)</label>
            <textarea value={instr} onChange={(e) => setInstr(e.target.value)} rows={2} placeholder="Ej: empieza con gancho fuerte, sin intro." className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-y" style={selStyle} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Vídeo (MP4 o MOV, máx. 200 MB)</label>
            <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" style={{ color: 'var(--foreground)' }} />
          </div>

          {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}

          <button onClick={subir} disabled={subiendo} className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
            {subiendo ? <><Loader2 size={16} className="animate-spin" /> Subiendo…</> : <><UploadCloud size={16} /> Subir y crear trabajo</>}
          </button>
        </div>
      </div>
    </div>
  )
}
