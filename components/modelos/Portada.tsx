'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Globe, X, User, Heart, Link2 } from 'lucide-react'

const CAMPOS_TEXTO = [
  'nombre_artistico', 'nombre_real', 'nacionalidad', 'ubicacion_ficticia', 'idioma', 'zona_horaria',
  'personalidad', 'energia', 'enfoque', 'tono', 'temas_gusta', 'limites', 'palabras_evitar', 'descripcion',
  'instagram', 'telegram', 'twitter', 'otros_enlaces', 'notas',
] as const

type Form = Record<string, string>

const LABELS: Record<string, string> = {
  nombre_artistico: 'Nombre artístico', nombre_real: 'Nombre real', nacionalidad: 'Nacionalidad',
  edad_real: 'Edad real', edad_ficticia: 'Edad ficticia', ubicacion_ficticia: 'Ubicación ficticia',
  idioma: 'Idioma', zona_horaria: 'Zona horaria',
  personalidad: 'Personalidad', energia: 'Energía', enfoque: 'Enfoque', tono: 'Tono',
  temas_gusta: 'Temas que le gustan', limites: 'Límites / qué NO hacer', palabras_evitar: 'Palabras a evitar', descripcion: 'Descripción general',
  instagram: 'Instagram', telegram: 'Telegram', twitter: 'Twitter / X', otros_enlaces: 'Otros enlaces', notas: 'Notas',
}

const SECCIONES: { titulo: string; icon: React.ElementType; campos: string[] }[] = [
  { titulo: 'Datos básicos', icon: User, campos: ['nombre_artistico', 'nombre_real', 'nacionalidad', 'edad_real', 'edad_ficticia', 'ubicacion_ficticia', 'idioma', 'zona_horaria'] },
  { titulo: 'Personalidad y marca', icon: Heart, campos: ['energia', 'personalidad', 'enfoque', 'tono', 'temas_gusta', 'limites', 'palabras_evitar', 'descripcion'] },
  { titulo: 'Redes y enlaces', icon: Link2, campos: ['instagram', 'telegram', 'twitter', 'otros_enlaces', 'notas'] },
]

const AREAS = new Set(['energia', 'personalidad', 'enfoque', 'tono', 'temas_gusta', 'limites', 'palabras_evitar', 'descripcion', 'otros_enlaces', 'notas'])

function vacio(f: Form) {
  return CAMPOS_TEXTO.every((k) => !f[k]) && !f.edad_real && !f.edad_ficticia
}

export default function Portada({ modeloId, nombre, foto }: { modeloId: string; nombre: string; foto: string | null }) {
  const [editable, setEditable] = useState(false)
  const [form, setForm] = useState<Form>({})
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`/api/modelos/${modeloId}/ficha`)
      const d = await r.json()
      setEditable(!!d.editable)
      const nf: Form = {}
      for (const k of CAMPOS_TEXTO) nf[k] = d[k] ?? ''
      nf.edad_real = d.edad_real != null && d.edad_real !== '' ? String(d.edad_real) : ''
      nf.edad_ficticia = d.edad_ficticia != null && d.edad_ficticia !== '' ? String(d.edad_ficticia) : ''
      setForm(nf)
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

  const set = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }))
  const card = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)' } as const
  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  if (cargando) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
  }

  // ── Modo edición ──
  if (editando) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>Editar identidad</h3>
          <button onClick={() => setEditando(false)} style={{ color: 'var(--muted)' }} aria-label="Cerrar"><X size={18} /></button>
        </div>
        {SECCIONES.map((sec) => {
          const Icon = sec.icon
          return (
            <div key={sec.titulo} className="rounded-2xl p-5" style={card}>
              <div className="flex items-center gap-2 mb-4">
                <Icon size={15} style={{ color: 'var(--gold)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{sec.titulo}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sec.campos.map((k) => (
                  <div key={k} className={AREAS.has(k) ? 'sm:col-span-2' : ''}>
                    <label className="text-xs font-medium block mb-1" style={{ color: 'var(--muted)' }}>{LABELS[k]}</label>
                    {AREAS.has(k) ? (
                      <textarea value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} rows={2} className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y" style={inputStyle} />
                    ) : (
                      <input value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        <div className="flex items-center gap-2">
          <button onClick={guardar} disabled={guardando} className="rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
            {guardando ? 'Guardando…' : 'Guardar identidad'}
          </button>
          <button onClick={() => { setEditando(false); cargar() }} className="rounded-lg px-4 py-2.5 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>Cancelar</button>
        </div>
      </div>
    )
  }

  // ── Vista ──
  return (
    <div className="space-y-4">
      {/* Carátula */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--gold-25)', backgroundColor: 'var(--surface)' }}>
        <div className="p-5 flex items-start gap-4" style={{ background: 'linear-gradient(120deg, var(--gold-15), transparent)' }}>
          <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-3xl font-bold shrink-0" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>
            {foto ? <img src={foto} alt={nombre} className="w-full h-full object-cover object-center" /> : nombre[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{nombre}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.nacionalidad && (
                <span className="flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                  <Globe size={12} /> {form.nacionalidad}
                </span>
              )}
            </div>
            {form.descripcion && <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--foreground)' }}>{form.descripcion}</p>}
          </div>
          {editable && (
            <button onClick={() => setEditando(true)} className="flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 shrink-0 transition-transform active:scale-95" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
              <Pencil size={15} /> Editar identidad
            </button>
          )}
        </div>
      </div>

      {/* Secciones */}
      {SECCIONES.map((sec) => {
        const Icon = sec.icon
        return (
          <div key={sec.titulo} className="rounded-2xl p-5" style={card}>
            <div className="flex items-center gap-2 mb-4">
              <Icon size={15} style={{ color: 'var(--gold)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{sec.titulo}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sec.campos.map((k) => {
                const val = form[k]
                return (
                  <div key={k} className={AREAS.has(k) ? 'sm:col-span-2' : ''}>
                    <p className="text-[11px] mb-0.5" style={{ color: 'var(--muted)' }}>{LABELS[k]}</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: val ? 'var(--foreground)' : 'var(--muted)' }}>{val || 'Sin definir'}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {editable && vacio(form) && (
        <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>Aún no has rellenado la identidad. Pulsa &quot;Editar identidad&quot; para empezar.</p>
      )}
    </div>
  )
}
