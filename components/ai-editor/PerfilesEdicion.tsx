'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Plus, Pencil, X } from 'lucide-react'
import { DEFAULT_PROFILE_SETTINGS, type EditingProfileSettings } from '@/lib/ai-editor/types'

type Modelo = { id: string; nombre: string }
type Item = { id: string; modelo_id: string; modelo: string; name: string; settings: EditingProfileSettings; custom_instructions: string; updated_at: string }

const INP = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const
const CARD = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)' } as const

function CampoNum({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
      <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={INP} />
    </div>
  )
}
function CampoSel({ label, value, opts, onChange }: { label: string; value: string; opts: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={INP}>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
function CampoTog({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={CARD}>
      <span style={{ color: 'var(--foreground)' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: on ? 'var(--gold)' : 'var(--muted)' }}>{on ? 'Sí' : 'No'}</span>
    </button>
  )
}

export default function PerfilesEdicion() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [editing, setEditing] = useState<Item | 'nuevo' | null>(null)

  const cargar = useCallback(async () => { try { const r = await fetch('/api/ai-editor/editing-profiles'); const d = await r.json(); setItems(d.items ?? []) } catch { setItems([]) } }, [])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { fetch('/api/ai-editor/modelos').then((r) => r.json()).then((d) => setModelos(d.modelos ?? [])).catch(() => {}) }, [])

  if (editing) return <Formulario modelos={modelos} item={editing === 'nuevo' ? null : editing} onDone={() => { setEditing(null); cargar() }} onCancel={() => setEditing(null)} />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing('nuevo')} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
          <Plus size={16} /> Nuevo perfil
        </button>
      </div>
      {items === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-center py-10" style={{ color: 'var(--muted)' }}>Aún no hay perfiles de edición. Crea el primero para una modelo.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-xl p-3" style={CARD}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{it.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{it.modelo}</p>
              </div>
              <button onClick={() => setEditing(it)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)', border: '1px solid var(--gold-25)' }}>
                <Pencil size={13} /> Editar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Formulario({ modelos, item, onDone, onCancel }: { modelos: Modelo[]; item: Item | null; onDone: () => void; onCancel: () => void }) {
  const [modeloId, setModeloId] = useState(item?.modelo_id ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [s, setS] = useState<EditingProfileSettings>(item?.settings && Object.keys(item.settings).length ? item.settings : DEFAULT_PROFILE_SETTINGS)
  const [instr, setInstr] = useState(item?.custom_instructions ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: unknown) => setS((prev) => ({ ...prev, [k]: v }))
  const numVal = (k: string) => { const v = s[k]; return typeof v === 'number' ? String(v) : '' }
  const bool = (k: string) => !!s[k]
  const strVal = (k: string) => { const v = s[k]; return typeof v === 'string' ? v : '' }
  const setNum = (k: string) => (v: string) => set(k, v === '' ? undefined : Number(v))

  async function guardar() {
    if (!modeloId || !name.trim()) { setError('Elige modelo y ponle un nombre al perfil.'); return }
    setError(''); setGuardando(true)
    try {
      await fetch('/api/ai-editor/editing-profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item?.id, modelo_id: modeloId, name, settings: s, custom_instructions: instr }) })
      onDone()
    } catch (e) { setError((e as Error).message); setGuardando(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{item ? 'Editar perfil' : 'Nuevo perfil'}</h3>
        <button onClick={onCancel} style={{ color: 'var(--muted)' }} aria-label="Cerrar"><X size={18} /></button>
      </div>

      <div className="rounded-2xl p-5" style={CARD}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Modelo</label>
            <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={INP}>
              <option value="">Elige modelo</option>
              {modelos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>Nombre del perfil</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Andrea Reels v1" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={INP} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={CARD}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Ajustes</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <CampoNum label="Duración mín (s)" value={numVal('targetDurationMin')} onChange={setNum('targetDurationMin')} />
          <CampoNum label="Duración máx (s)" value={numVal('targetDurationMax')} onChange={setNum('targetDurationMax')} />
          <CampoSel label="Formato" value={strVal('aspectRatio')} opts={['9:16', '1:1', '16:9', '4:5']} onChange={(v) => set('aspectRatio', v)} />
          <CampoSel label="Ritmo de cortes" value={strVal('cutSpeed')} opts={['slow', 'medium', 'fast']} onChange={(v) => set('cutSpeed', v)} />
          <CampoNum label="Cortes a combinar" value={numVal('cutsToCombine')} onChange={setNum('cutsToCombine')} />
          <CampoNum label="FPS" value={numVal('fps')} onChange={setNum('fps')} />
          <CampoNum label="Zoom máx (ej 1.2)" value={numVal('maximumZoom')} onChange={setNum('maximumZoom')} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          <CampoTog label="Quitar silencios" on={bool('removeSilence')} onClick={() => set('removeSilence', !bool('removeSilence'))} />
          <CampoTog label="Quitar preparación" on={bool('removePreparation')} onClick={() => set('removePreparation', !bool('removePreparation'))} />
          <CampoTog label="Quitar final" on={bool('removeEnding')} onClick={() => set('removeEnding', !bool('removeEnding'))} />
          <CampoTog label="Prioridad cara" on={bool('facePriority')} onClick={() => set('facePriority', !bool('facePriority'))} />
          <CampoTog label="Prioridad cuerpo" on={bool('bodyPriority')} onClick={() => set('bodyPriority', !bool('bodyPriority'))} />
          <CampoTog label="Auto encuadre" on={bool('autoCrop')} onClick={() => set('autoCrop', !bool('autoCrop'))} />
          <CampoTog label="Auto zoom" on={bool('autoZoom')} onClick={() => set('autoZoom', !bool('autoZoom'))} />
          <CampoTog label="Zoom por segundo" on={bool('zoomPerSecond')} onClick={() => set('zoomPerSecond', !bool('zoomPerSecond'))} />
          <CampoTog label="Normalizar audio" on={bool('audioNormalization')} onClick={() => set('audioNormalization', !bool('audioNormalization'))} />
        </div>
      </div>

      <div className="rounded-2xl p-5" style={CARD}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Instrucciones (texto libre)</p>
        <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Escríbelo como si se lo dijeras a un editor humano.</p>
        <textarea value={instr} onChange={(e) => setInstr(e.target.value)} rows={5} placeholder="Ej: Andrea debe verse natural y cercana. Combina 3 cortes ágiles con un zoom suave. Prioriza cara y silueta. No cierres demasiado el encuadre ni cortes las piernas por encima de la rodilla. Nada de transiciones llamativas." className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y" style={INP} />
      </div>

      {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}

      <div className="flex items-center gap-2">
        <button onClick={guardar} disabled={guardando} className="rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
          {guardando ? 'Guardando…' : 'Guardar perfil'}
        </button>
        <button onClick={onCancel} className="rounded-lg px-4 py-2.5 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>Cancelar</button>
      </div>
    </div>
  )
}
