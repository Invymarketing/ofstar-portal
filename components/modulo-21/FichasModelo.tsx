'use client'

import { useMemo, useState } from 'react'
import { guardarFicha } from '@/app/(dashboard)/modulo-21/actions'
import { Search, Pencil, Save, X, User, Heart, DollarSign, Link2 } from 'lucide-react'

export interface Ficha {
  modelo_id: string
  nombre_artistico?: string | null; nombre_real?: string | null; nicho?: string | null
  edad_real?: number | null; edad_ficticia?: number | null; ubicacion_ficticia?: string | null
  idioma?: string | null; zona_horaria?: string | null
  personalidad?: string | null; tono?: string | null; temas_gusta?: string | null
  limites?: string | null; palabras_evitar?: string | null
  precio_custom?: string | null; precio_vc?: string | null; precio_ppv?: string | null
  precio_sexting?: string | null; packs?: string | null; pagos_por_fuera?: string | null
  instagram?: string | null; telegram?: string | null; twitter?: string | null
  otros_enlaces?: string | null; notas?: string | null
}
interface Modelo { id: string; model_name: string }

const money = (s?: string | null) => s || '—'

export default function FichasModelo(
  { modelos, fichas, esEditor }: { modelos: Modelo[]; fichas: Ficha[]; esEditor: boolean }
) {
  const fichaMap = useMemo(() => new Map(fichas.map((f) => [f.modelo_id, f])), [fichas])
  const [sel, setSel] = useState<string>(modelos[0]?.id ?? '')
  const [q, setQ] = useState('')
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Ficha>({ modelo_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lista = useMemo(
    () => modelos.filter((m) => m.model_name.toLowerCase().includes(q.toLowerCase())),
    [modelos, q]
  )
  const modelo = modelos.find((m) => m.id === sel)
  const ficha = fichaMap.get(sel) ?? { modelo_id: sel }

  const card = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)' } as const
  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  function abrirEdicion() {
    setForm({ ...ficha, modelo_id: sel })
    setEditando(true); setError(null)
  }
  function set<K extends keyof Ficha>(k: K, v: Ficha[K]) { setForm((p) => ({ ...p, [k]: v })) }

  async function guardar() {
    setSaving(true); setError(null)
    try {
      await guardarFicha(sel, form as unknown as Record<string, unknown>)
      setEditando(false)
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setSaving(false) }
  }

  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-[11px] mb-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-sm whitespace-pre-wrap" style={{ color: value != null && value !== '' ? 'var(--foreground)' : 'var(--muted)' }}>
        {value != null && value !== '' ? value : '—'}
      </p>
    </div>
  )
  const Input = ({ k, label, ph, area }: { k: keyof Ficha; label: string; ph?: string; area?: boolean }) => (
    <div>
      <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
      {area ? (
        <textarea value={(form[k] as string) ?? ''} onChange={(e) => set(k, e.target.value as never)} rows={2} placeholder={ph}
          className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
      ) : (
        <input value={(form[k] as string) ?? ''} onChange={(e) => set(k, e.target.value as never)} placeholder={ph}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
      )}
    </div>
  )
  const Seccion = ({ icon: Icon, titulo, children }: { icon: React.ElementType; titulo: string; children: React.ReactNode }) => (
    <div className="rounded-2xl p-5" style={card}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} style={{ color: 'var(--gold)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{titulo}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
      {/* Lista de modelos */}
      <div className="rounded-2xl p-3 h-fit lg:sticky lg:top-4" style={card}>
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-2" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
          <Search size={14} style={{ color: 'var(--muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelo…"
            className="bg-transparent text-sm outline-none w-full" style={{ color: 'var(--foreground)' }} />
        </div>
        <div className="space-y-0.5 max-h-[70vh] overflow-y-auto">
          {lista.map((m) => {
            const on = m.id === sel
            const tiene = fichaMap.has(m.id)
            return (
              <button key={m.id} onClick={() => { setSel(m.id); setEditando(false) }}
                className="w-full flex items-center justify-between text-left rounded-lg px-3 py-2 text-sm transition-all"
                style={on
                  ? { backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }
                  : { color: 'var(--muted)' }}>
                <span className="truncate">{m.model_name}</span>
                {!tiene && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--background)', color: 'var(--muted)' }}>vacía</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ficha */}
      <div className="space-y-4">
        {!modelo ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay modelos.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{modelo.model_name}</h2>
              {esEditor && !editando && (
                <button onClick={abrirEdicion} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium"
                  style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)', border: '1px solid var(--gold)' }}>
                  <Pencil size={14} /> Editar ficha
                </button>
              )}
              {editando && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditando(false)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                    <X size={14} /> Cancelar
                  </button>
                  <button onClick={guardar} disabled={saving} className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: 'var(--gold)', color: 'var(--background)' }}>
                    <Save size={14} /> {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

            {!editando ? (
              <>
                <Seccion icon={User} titulo="Datos básicos">
                  <Field label="Nombre artístico" value={ficha.nombre_artistico} />
                  <Field label="Nombre real" value={ficha.nombre_real} />
                  <Field label="Nicho" value={ficha.nicho} />
                  <Field label="Edad real / ficticia" value={[ficha.edad_real, ficha.edad_ficticia].filter(Boolean).join(' / ') || null} />
                  <Field label="Ubicación ficticia" value={ficha.ubicacion_ficticia} />
                  <Field label="Idioma" value={ficha.idioma} />
                  <Field label="Zona horaria" value={ficha.zona_horaria} />
                </Seccion>
                <Seccion icon={Heart} titulo="Personalidad y tono">
                  <Field label="Personalidad" value={ficha.personalidad} />
                  <Field label="Tono" value={ficha.tono} />
                  <Field label="Temas que le gustan" value={ficha.temas_gusta} />
                  <Field label="Límites / qué NO hacer" value={ficha.limites} />
                  <Field label="Palabras a evitar" value={ficha.palabras_evitar} />
                </Seccion>
                <Seccion icon={DollarSign} titulo="Precios y servicios">
                  <Field label="Custom" value={money(ficha.precio_custom)} />
                  <Field label="Videollamada" value={money(ficha.precio_vc)} />
                  <Field label="PPV" value={money(ficha.precio_ppv)} />
                  <Field label="Sexting" value={money(ficha.precio_sexting)} />
                  <Field label="Packs" value={ficha.packs} />
                  <Field label="Pagos por fuera" value={ficha.pagos_por_fuera} />
                </Seccion>
                <Seccion icon={Link2} titulo="Redes y enlaces">
                  <Field label="Instagram" value={ficha.instagram} />
                  <Field label="Telegram" value={ficha.telegram} />
                  <Field label="Twitter / X" value={ficha.twitter} />
                  <Field label="Otros enlaces" value={ficha.otros_enlaces} />
                  <Field label="Notas" value={ficha.notas} />
                </Seccion>
              </>
            ) : (
              <>
                <Seccion icon={User} titulo="Datos básicos">
                  <Input k="nombre_artistico" label="Nombre artístico" />
                  <Input k="nombre_real" label="Nombre real" />
                  <Input k="nicho" label="Nicho" />
                  <Input k="ubicacion_ficticia" label="Ubicación ficticia" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input k="edad_real" label="Edad real" ph="ej. 24" />
                    <Input k="edad_ficticia" label="Edad ficticia" ph="ej. 21" />
                  </div>
                  <Input k="idioma" label="Idioma" />
                  <Input k="zona_horaria" label="Zona horaria" />
                </Seccion>
                <Seccion icon={Heart} titulo="Personalidad y tono">
                  <Input k="personalidad" label="Personalidad" area />
                  <Input k="tono" label="Tono" area />
                  <Input k="temas_gusta" label="Temas que le gustan" area />
                  <Input k="limites" label="Límites / qué NO hacer" area />
                  <Input k="palabras_evitar" label="Palabras a evitar" area />
                </Seccion>
                <Seccion icon={DollarSign} titulo="Precios y servicios">
                  <Input k="precio_custom" label="Custom" ph="ej. 50€ / min" />
                  <Input k="precio_vc" label="Videollamada" />
                  <Input k="precio_ppv" label="PPV" />
                  <Input k="precio_sexting" label="Sexting" />
                  <Input k="packs" label="Packs" area />
                  <Input k="pagos_por_fuera" label="Pagos por fuera" area />
                </Seccion>
                <Seccion icon={Link2} titulo="Redes y enlaces">
                  <Input k="instagram" label="Instagram" ph="@usuario" />
                  <Input k="telegram" label="Telegram" />
                  <Input k="twitter" label="Twitter / X" />
                  <Input k="otros_enlaces" label="Otros enlaces" area />
                  <Input k="notas" label="Notas" area />
                </Seccion>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
