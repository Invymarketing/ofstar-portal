'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Globe, Tag, Zap, Heart, Target, X } from 'lucide-react'

interface Ficha {
  nicho: string | null
  nacionalidad: string
  energia: string
  personalidad: string
  enfoque: string
  descripcion: string
  editable: boolean
}

export default function Portada({ modeloId, nombre, foto }: { modeloId: string; nombre: string; foto: string | null }) {
  const [f, setF] = useState<Ficha | null>(null)
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ nacionalidad: '', energia: '', personalidad: '', enfoque: '', descripcion: '' })

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`/api/modelos/${modeloId}/ficha`)
      const d = await r.json()
      setF(d)
      setForm({ nacionalidad: d.nacionalidad || '', energia: d.energia || '', personalidad: d.personalidad || '', enfoque: d.enfoque || '', descripcion: d.descripcion || '' })
    } catch { /* noop */ }
    setCargando(false)
  }, [modeloId])

  useEffect(() => { cargar() }, [cargar])

  async function guardar() {
    setGuardando(true)
    await fetch(`/api/modelos/${modeloId}/ficha`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setGuardando(false)
    setEditando(false)
    cargar()
  }

  const card = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)' } as const
  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  if (cargando || !f) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
  }

  if (editando) {
    const campos: { k: keyof typeof form; label: string; ph: string; area?: boolean }[] = [
      { k: 'nacionalidad', label: 'Nacionalidad', ph: 'Ej. España' },
      { k: 'descripcion', label: 'Descripción general', ph: 'Una línea que la resuma…', area: true },
      { k: 'energia', label: 'Energía', ph: '¿Qué energía transmite? (cercana, dominante, dulce…)', area: true },
      { k: 'personalidad', label: 'Personalidad', ph: '¿Cómo es? (divertida, misteriosa, natural…)', area: true },
      { k: 'enfoque', label: 'Enfoque', ph: '¿En qué se centra su contenido/marca?', area: true },
    ]
    return (
      <div className="rounded-2xl p-5" style={card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Editar branding</h3>
          <button onClick={() => setEditando(false)} style={{ color: 'var(--muted)' }} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          {campos.map((c) => (
            <div key={c.k}>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>{c.label}</label>
              {c.area ? (
                <textarea value={form[c.k]} onChange={(e) => setForm((s) => ({ ...s, [c.k]: e.target.value }))} placeholder={c.ph} rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y" style={inputStyle} />
              ) : (
                <input value={form[c.k]} onChange={(e) => setForm((s) => ({ ...s, [c.k]: e.target.value }))} placeholder={c.ph}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={guardar} disabled={guardando} className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={() => setEditando(false)} className="rounded-lg px-4 py-2 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>Cancelar</button>
        </div>
      </div>
    )
  }

  const bloques = [
    { icon: Zap, label: 'Energía', val: f.energia },
    { icon: Heart, label: 'Personalidad', val: f.personalidad },
    { icon: Target, label: 'Enfoque', val: f.enfoque },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--gold-25)', backgroundColor: 'var(--surface)' }}>
        <div className="p-5 flex items-start gap-4" style={{ background: 'linear-gradient(120deg, var(--gold-15), transparent)' }}>
          <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-3xl font-bold shrink-0" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>
            {foto ? <img src={foto} alt={nombre} className="w-full h-full object-cover object-center" /> : nombre[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{nombre}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {f.nicho && (
                <span className="flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>
                  <Tag size={12} /> {f.nicho}
                </span>
              )}
              {f.nacionalidad && (
                <span className="flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  <Globe size={12} /> {f.nacionalidad}
                </span>
              )}
            </div>
            {f.descripcion && <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--foreground)' }}>{f.descripcion}</p>}
          </div>
          {f.editable && (
            <button onClick={() => setEditando(true)} className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 shrink-0" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
              <Pencil size={13} /> Editar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {bloques.map((b) => {
          const Icon = b.icon
          return (
            <div key={b.label} className="rounded-2xl p-4" style={card}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} style={{ color: 'var(--gold)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{b.label}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: b.val ? 'var(--foreground)' : 'var(--muted)' }}>
                {b.val || 'Sin definir todavía.'}
              </p>
            </div>
          )
        })}
      </div>

      {!f.nicho && !f.nacionalidad && !f.descripcion && !f.energia && !f.personalidad && !f.enfoque && f.editable && (
        <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>Aún no has rellenado el branding. Pulsa "Editar" para empezar.</p>
      )}
    </div>
  )
}
