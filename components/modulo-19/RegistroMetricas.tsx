'use client'

import { useMemo, useState } from 'react'
import { guardarAudiencia } from '@/app/(dashboard)/modulo-19/actions'
import { Check, ChevronDown, Save, Star } from 'lucide-react'

const TRAMOS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']
const PAISES_COMUNES = ['España', 'México', 'Estados Unidos', 'Argentina', 'Colombia', 'Chile', 'Perú', 'Reino Unido', 'Alemania', 'Francia', 'Italia', 'Brasil', 'Canadá', 'Venezuela', 'Ecuador', 'Uruguay', 'Paraguay', 'Bolivia', 'República Dominicana', 'Australia', 'Países Bajos', 'Suiza', 'Portugal']

interface Cuenta { id: string; ig_username: string; modelo: string; es_principal: boolean }
interface Ficha {
  cuenta_id: string
  paises?: { pais: string; pct: number }[]
  genero_mujeres?: number | string | null
  genero_hombres?: number | string | null
  edades?: Record<string, number> | null
  alcance?: number | null
  impresiones?: number | null
  visitas_perfil?: number | null
}

export default function RegistroMetricas({ cuentas, semana, fichas }: { cuentas: Cuenta[]; semana: string; fichas: Ficha[] }) {
  const hechas = useMemo(() => new Set(fichas.map((f) => f.cuenta_id)), [fichas])
  const fichaDe = useMemo(() => new Map(fichas.map((f) => [f.cuenta_id, f])), [fichas])
  const [abierta, setAbierta] = useState<string | null>(null)

  const [paises, setPaises] = useState<{ pais: string; pct: string }[]>([])
  const [mujeres, setMujeres] = useState('')
  const [hombres, setHombres] = useState('')
  const [edades, setEdades] = useState<Record<string, string>>({})
  const [alcance, setAlcance] = useState('')
  const [impresiones, setImpresiones] = useState('')
  const [visitas, setVisitas] = useState('')
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  function abrir(c: Cuenta) {
    if (abierta === c.id) { setAbierta(null); return }
    const f = fichaDe.get(c.id)
    const p = (f?.paises ?? []) as { pais: string; pct: number }[]
    setPaises([0, 1, 2, 3, 4].map((i) => ({ pais: p[i]?.pais ?? '', pct: p[i]?.pct != null ? String(p[i].pct) : '' })))
    setMujeres(f?.genero_mujeres != null ? String(f.genero_mujeres) : '')
    setHombres(f?.genero_hombres != null ? String(f.genero_hombres) : '')
    const e: Record<string, string> = {}
    for (const t of TRAMOS) e[t] = f?.edades?.[t] != null ? String(f.edades[t]) : ''
    setEdades(e)
    setAlcance(f?.alcance != null ? String(f.alcance) : '')
    setImpresiones(f?.impresiones != null ? String(f.impresiones) : '')
    setVisitas(f?.visitas_perfil != null ? String(f.visitas_perfil) : '')
    setOk(false)
    setAbierta(c.id)
  }

  async function guardar(cuentaId: string) {
    setSaving(true)
    try {
      const paisesLimpios = paises.map((r) => ({ pais: r.pais.trim(), pct: Number(r.pct) || 0 })).filter((r) => r.pais && r.pct > 0)
      const edadesLimpias: Record<string, number> = {}
      for (const t of TRAMOS) { const v = Number(edades[t]); if (v > 0) edadesLimpias[t] = v }
      await guardarAudiencia({
        cuenta_id: cuentaId,
        semana_inicio: semana,
        paises: paisesLimpios,
        genero_mujeres: mujeres === '' ? null : Number(mujeres),
        genero_hombres: hombres === '' ? null : Number(hombres),
        edades: edadesLimpias,
        alcance: alcance === '' ? null : Number(alcance),
        impresiones: impresiones === '' ? null : Number(impresiones),
        visitas_perfil: visitas === '' ? null : Number(visitas),
      })
      setOk(true)
      setTimeout(() => window.location.reload(), 700)
    } finally {
      setSaving(false)
    }
  }

  const porModelo = useMemo(() => {
    const m = new Map<string, Cuenta[]>()
    for (const c of cuentas) { const arr = m.get(c.modelo) ?? []; arr.push(c); m.set(c.modelo, arr) }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [cuentas])

  const sumaPaises = paises.reduce((a, r) => a + (Number(r.pct) || 0), 0)
  const sumaEdades = TRAMOS.reduce((a, t) => a + (Number(edades[t]) || 0), 0)
  const sumaGenero = (Number(mujeres) || 0) + (Number(hombres) || 0)

  const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const
  const labelSt = { color: 'var(--muted)' }
  const sumaColor = (s: number) => (s >= 95 && s <= 105 ? '#4ADE80' : s === 0 ? 'var(--muted)' : '#EAB308')

  const pct = cuentas.length ? Math.round((hechas.size / cuentas.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Progreso de esta semana</p>
          <p className="text-sm font-bold" style={{ color: pct >= 100 ? '#4ADE80' : 'var(--gold)' }}>{hechas.size} de {cuentas.length}</p>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#4ADE80' : 'var(--gold)' }} />
        </div>
      </div>

      <datalist id="paises-comunes">{PAISES_COMUNES.map((p) => <option key={p} value={p} />)}</datalist>

      {porModelo.map(([modelo, lista]) => (
        <div key={modelo}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>{modelo}</h3>
          <div className="rounded-2xl border divide-y overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            {lista.map((c) => (
              <div key={c.id} style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => abrir(c)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                    @{c.ig_username}
                    {c.es_principal && <Star size={12} style={{ color: 'var(--gold)' }} fill="var(--gold)" />}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    {hechas.has(c.id)
                      ? <span className="flex items-center gap-1" style={{ color: '#4ADE80' }}><Check size={14} /> Hecha</span>
                      : <span style={{ color: 'var(--muted)' }}>Pendiente</span>}
                    <ChevronDown size={15} style={{ color: 'var(--muted)', transform: abierta === c.id ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </span>
                </button>

                {abierta === c.id && (
                  <div className="px-4 pb-5 pt-1 space-y-5" style={{ borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold" style={labelSt}>Países principales (top 5)</p>
                        <p className="text-[11px]" style={{ color: sumaColor(sumaPaises) }}>suma: {sumaPaises}%</p>
                      </div>
                      <div className="space-y-2">
                        {paises.map((r, i) => (
                          <div key={i} className="flex gap-2">
                            <input list="paises-comunes" value={r.pais} placeholder={`País ${i + 1}`}
                              onChange={(e) => setPaises((prev) => prev.map((x, j) => j === i ? { ...x, pais: e.target.value } : x))}
                              className="flex-1 rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                            <div className="relative w-24">
                              <input type="number" min="0" max="100" value={r.pct} placeholder="%"
                                onChange={(e) => setPaises((prev) => prev.map((x, j) => j === i ? { ...x, pct: e.target.value } : x))}
                                className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold" style={labelSt}>Género</p>
                        <p className="text-[11px]" style={{ color: sumaColor(sumaGenero) }}>suma: {sumaGenero}%</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] block mb-1" style={labelSt}>% Mujeres</label>
                          <input type="number" min="0" max="100" value={mujeres} onChange={(e) => setMujeres(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                        </div>
                        <div>
                          <label className="text-[11px] block mb-1" style={labelSt}>% Hombres</label>
                          <input type="number" min="0" max="100" value={hombres} onChange={(e) => setHombres(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold" style={labelSt}>Edad (% por tramo)</p>
                        <p className="text-[11px]" style={{ color: sumaColor(sumaEdades) }}>suma: {sumaEdades}%</p>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {TRAMOS.map((t) => (
                          <div key={t}>
                            <label className="text-[11px] block mb-1" style={labelSt}>{t}</label>
                            <input type="number" min="0" max="100" value={edades[t] ?? ''} onChange={(e) => setEdades((prev) => ({ ...prev, [t]: e.target.value }))} className="w-full rounded-lg px-2 py-2 text-sm" style={inputStyle} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold mb-2" style={labelSt}>Datos de la semana</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] block mb-1" style={labelSt}>Alcance</label>
                          <input type="number" min="0" value={alcance} onChange={(e) => setAlcance(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                        </div>
                        <div>
                          <label className="text-[11px] block mb-1" style={labelSt}>Impresiones</label>
                          <input type="number" min="0" value={impresiones} onChange={(e) => setImpresiones(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                        </div>
                        <div>
                          <label className="text-[11px] block mb-1" style={labelSt}>Visitas al perfil</label>
                          <input type="number" min="0" value={visitas} onChange={(e) => setVisitas(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button onClick={() => guardar(c.id)} disabled={saving}
                        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                        style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
                        <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
                      </button>
                      {ok && <span className="text-xs" style={{ color: '#4ADE80' }}>✓ Guardado</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {cuentas.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No hay cuentas propias activas.</p>
      )}
    </div>
  )
}
