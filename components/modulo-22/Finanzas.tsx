'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { guardarModelo, addGasto, delGasto } from '@/app/(dashboard)/modulo-22/actions'
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2, Save } from 'lucide-react'

interface Modelo { id: string; model_name: string }
interface FinM { modelo_id: string; mes: string; suscripciones: number | string; pagos: number | string; propinas: number | string; pagos_externos: number | string; comision_pct: number | string; incluye_subs: boolean }
interface Gasto { id: string; ambito: string; modelo_id: string | null; mes: string; concepto: string; monto: number | string }

const num = (v: unknown) => Number(v) || 0
const money = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money0 = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
const fmtEjeMoney = (n: number) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`)
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const labelMes = (mes: string) => { const [y, m] = mes.split('-').map(Number); return `${MESES[m - 1]} ${y}` }
const shiftMes = (mes: string, d: number) => { const [y, m] = mes.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1 + d, 1)); return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}` }

const inputStyle = { backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

const LINEAS = [
  { key: 'facturacion', label: 'Facturación total', color: '#60A5FA' },
  { key: 'ingreso', label: 'Ingreso (comisiones)', color: '#EAB308' },
  { key: 'gastos', label: 'Gastos totales', color: '#F87171' },
  { key: 'beneficio', label: 'Beneficio neto', color: '#4ADE80' },
] as const

function GastosBloque({ lista, ambito, modeloId, mes }: { lista: Gasto[]; ambito: string; modeloId: string | null; mes: string }) {
  const router = useRouter()
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [busy, setBusy] = useState(false)
  const total = lista.reduce((a, g) => a + num(g.monto), 0)
  async function add() {
    if (!concepto.trim() || num(monto) <= 0) return
    setBusy(true)
    try { await addGasto({ ambito, modelo_id: modeloId, mes, concepto: concepto.trim(), monto: num(monto) }); setConcepto(''); setMonto(''); router.refresh() } finally { setBusy(false) }
  }
  async function quitar(id: string) { setBusy(true); try { await delGasto(id); router.refresh() } finally { setBusy(false) } }
  return (
    <div className="space-y-2">
      {lista.length > 0 && (
        <div className="space-y-1">
          {lista.map((g) => (
            <div key={g.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--background)' }}>
              <span style={{ color: 'var(--foreground)' }}>{g.concepto}</span>
              <span className="flex items-center gap-3">
                <span style={{ color: '#F87171' }}>{money(num(g.monto))}</span>
                <button onClick={() => quitar(g.id)} disabled={busy} style={{ color: 'var(--muted)' }}><Trash2 size={14} /></button>
              </span>
            </div>
          ))}
          <div className="flex justify-between text-xs px-3 pt-1"><span style={{ color: 'var(--muted)' }}>Total</span><span style={{ color: '#F87171', fontWeight: 600 }}>{money(total)}</span></div>
        </div>
      )}
      <div className="flex gap-2">
        <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Concepto" className="flex-1 rounded-lg px-3 py-2 text-sm" style={inputStyle} />
        <input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Monto" className="w-28 rounded-lg px-3 py-2 text-sm" style={inputStyle} />
        <button onClick={add} disabled={busy} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}><Plus size={14} /></button>
      </div>
    </div>
  )
}

function HistTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{money0(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Historico({ serie }: { serie: { mes: string; facturacion: number; ingreso: number; gastos: number; beneficio: number }[] }) {
  const years = useMemo(() => {
    const ys = new Set(serie.map((s) => s.mes.slice(0, 4)))
    ys.add(String(new Date().getFullYear()))
    return [...ys].sort().reverse()
  }, [serie])
  const [year, setYear] = useState(years[0])
  const [periodo, setPeriodo] = useState('año')

  const mesesPeriodo: number[] | null = periodo === 'año' ? null : ({ q1: [1, 2, 3], q2: [4, 5, 6], q3: [7, 8, 9], q4: [10, 11, 12] } as Record<string, number[]>)[periodo]
  const data = useMemo(() => serie
    .filter((s) => s.mes.slice(0, 4) === year)
    .filter((s) => !mesesPeriodo || mesesPeriodo.includes(Number(s.mes.slice(5, 7))))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((s) => ({ ...s, label: MESES_CORTO[Number(s.mes.slice(5, 7)) - 1] })), [serie, year, periodo])

  const tot = data.reduce((a, s) => ({ facturacion: a.facturacion + s.facturacion, ingreso: a.ingreso + s.ingreso, gastos: a.gastos + s.gastos, beneficio: a.beneficio + s.beneficio }), { facturacion: 0, ingreso: 0, gastos: 0, beneficio: 0 })
  const margen = tot.ingreso > 0 ? (tot.beneficio / tot.ingreso) * 100 : 0

  const PERIODOS = [{ id: 'año', l: 'Año' }, { id: 'q1', l: 'Q1' }, { id: 'q2', l: 'Q2' }, { id: 'q3', l: 'Q3' }, { id: 'q4', l: 'Q4' }]
  const card = { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' } as const

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
          {PERIODOS.map((p) => (
            <button key={p.id} onClick={() => setPeriodo(p.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: periodo === p.id ? 'var(--gold-15)' : 'transparent', color: periodo === p.id ? 'var(--gold)' : 'var(--muted)' }}>{p.l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border p-4" style={card}><p className="text-[11px]" style={{ color: 'var(--muted)' }}>Facturación total</p><p className="text-lg font-bold" style={{ color: '#60A5FA' }}>{money0(tot.facturacion)}</p></div>
        <div className="rounded-2xl border p-4" style={card}><p className="text-[11px]" style={{ color: 'var(--muted)' }}>Ingreso</p><p className="text-lg font-bold" style={{ color: '#EAB308' }}>{money0(tot.ingreso)}</p></div>
        <div className="rounded-2xl border p-4" style={card}><p className="text-[11px]" style={{ color: 'var(--muted)' }}>Gastos totales</p><p className="text-lg font-bold" style={{ color: '#F87171' }}>{money0(tot.gastos)}</p></div>
        <div className="rounded-2xl border p-4" style={card}><p className="text-[11px]" style={{ color: 'var(--muted)' }}>Beneficio neto</p><p className="text-lg font-bold" style={{ color: tot.beneficio >= 0 ? '#4ADE80' : '#F87171' }}>{money0(tot.beneficio)}</p><p className="text-[11px]" style={{ color: 'var(--muted)' }}>margen {margen.toFixed(1)}%</p></div>
      </div>

      <div className="rounded-2xl border p-4" style={card}>
        {data.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-center px-4" style={{ color: 'var(--muted)' }}>No hay datos registrados en este periodo.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis tickFormatter={fmtEjeMoney} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={52} />
              <Tooltip content={<HistTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {LINEAS.map((l) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot={{ r: 3, fill: l.color }} activeDot={{ r: 4 }} />)}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default function Finanzas({ mes, modelos, finModelo, gastos }: { mes: string; modelos: Modelo[]; finModelo: FinM[]; gastos: Gasto[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'registro' | 'historico'>('registro')

  const finDe = useMemo(() => new Map(finModelo.filter((f) => f.mes === mes).map((f) => [f.modelo_id, f])), [finModelo, mes])
  const gastosMes = useMemo(() => gastos.filter((g) => g.mes === mes), [gastos, mes])
  const gastosDeModelo = (id: string) => gastosMes.filter((g) => g.ambito === 'modelo' && g.modelo_id === id)
  const gastosAgencia = gastosMes.filter((g) => g.ambito === 'agencia')
  const gastosEquipo = gastosMes.filter((g) => g.ambito === 'equipo')

  function calc(f: FinM | undefined, id: string) {
    if (!f) return { bruto: 0, base: 0, comision: 0, gastos: 0, beneficio: 0 }
    const bruto = num(f.suscripciones) + num(f.pagos) + num(f.propinas) + num(f.pagos_externos)
    const base = f.incluye_subs ? bruto : bruto - num(f.suscripciones)
    const comision = base * num(f.comision_pct) / 100
    const gm = gastosDeModelo(id).reduce((a, g) => a + num(g.monto), 0)
    return { bruto, base, comision, gastos: gm, beneficio: comision - gm }
  }

  const resumen = useMemo(() => {
    let facturacion = 0, ingreso = 0, gModelos = 0
    for (const m of modelos) { const c = calc(finDe.get(m.id), m.id); facturacion += c.bruto; ingreso += c.comision; gModelos += c.gastos }
    const gAg = gastosAgencia.reduce((a, g) => a + num(g.monto), 0)
    const gEq = gastosEquipo.reduce((a, g) => a + num(g.monto), 0)
    const gastosTotal = gModelos + gAg + gEq
    const beneficio = ingreso - gastosTotal
    return { facturacion, ingreso, gModelos, gAg, gEq, gastosTotal, beneficio, margen: ingreso > 0 ? (beneficio / ingreso) * 100 : 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelos, finDe, gastosMes])

  const serie = useMemo(() => {
    const meses = new Set<string>([...finModelo.map((f) => f.mes), ...gastos.map((g) => g.mes)])
    return [...meses].map((mm) => {
      let facturacion = 0, ingreso = 0
      for (const f of finModelo.filter((x) => x.mes === mm)) {
        const bruto = num(f.suscripciones) + num(f.pagos) + num(f.propinas) + num(f.pagos_externos)
        const base = f.incluye_subs ? bruto : bruto - num(f.suscripciones)
        facturacion += bruto; ingreso += base * num(f.comision_pct) / 100
      }
      const gTot = gastos.filter((x) => x.mes === mm).reduce((a, x) => a + num(x.monto), 0)
      return { mes: mm, facturacion, ingreso, gastos: gTot, beneficio: ingreso - gTot }
    }).sort((a, b) => a.mes.localeCompare(b.mes))
  }, [finModelo, gastos])

  const [abierta, setAbierta] = useState<string | null>(null)
  const [subs, setSubs] = useState(''); const [pagos, setPagos] = useState(''); const [prop, setProp] = useState(''); const [ext, setExt] = useState('')
  const [pct, setPct] = useState(''); const [incSubs, setIncSubs] = useState(true)
  const [saving, setSaving] = useState(false)

  function abrir(id: string) {
    if (abierta === id) { setAbierta(null); return }
    const f = finDe.get(id)
    setSubs(f ? String(f.suscripciones) : ''); setPagos(f ? String(f.pagos) : ''); setProp(f ? String(f.propinas) : ''); setExt(f ? String(f.pagos_externos) : '')
    setPct(f ? String(f.comision_pct) : ''); setIncSubs(f ? !!f.incluye_subs : true)
    setAbierta(id)
  }
  async function guardar(id: string) {
    setSaving(true)
    try { await guardarModelo({ modelo_id: id, mes, suscripciones: num(subs), pagos: num(pagos), propinas: num(prop), pagos_externos: num(ext), comision_pct: num(pct), incluye_subs: incSubs }); router.refresh(); setAbierta(null) } finally { setSaving(false) }
  }

  const previewBruto = num(subs) + num(pagos) + num(prop) + num(ext)
  const previewBase = incSubs ? previewBruto : previewBruto - num(subs)
  const previewComision = previewBase * num(pct) / 100
  const card = { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' } as const

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {(['registro', 'historico'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: tab === t ? 'var(--gold-15)' : 'transparent', color: tab === t ? 'var(--gold)' : 'var(--muted)' }}>
            {t === 'registro' ? 'Registro del mes' : 'Histórico'}
          </button>
        ))}
      </div>

      {tab === 'historico' ? <Historico serie={serie} /> : (
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => router.push(`/modulo-22?mes=${shiftMes(mes, -1)}`)} className="p-2 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold capitalize" style={{ color: 'var(--foreground)', minWidth: 150, textAlign: 'center' }}>{labelMes(mes)}</span>
            <button onClick={() => router.push(`/modulo-22?mes=${shiftMes(mes, 1)}`)} className="p-2 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}><ChevronRight size={16} /></button>
          </div>

          <div className="rounded-2xl border p-5" style={card}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Resumen del mes</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div><p className="text-[11px]" style={{ color: 'var(--muted)' }}>Facturación total</p><p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{money0(resumen.facturacion)}</p></div>
              <div><p className="text-[11px]" style={{ color: 'var(--muted)' }}>Ingreso (comisiones)</p><p className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{money0(resumen.ingreso)}</p></div>
              <div><p className="text-[11px]" style={{ color: 'var(--muted)' }}>Gastos totales</p><p className="text-lg font-bold" style={{ color: '#F87171' }}>{money0(resumen.gastosTotal)}</p></div>
              <div><p className="text-[11px]" style={{ color: 'var(--muted)' }}>Beneficio neto</p><p className="text-lg font-bold" style={{ color: resumen.beneficio >= 0 ? '#4ADE80' : '#F87171' }}>{money0(resumen.beneficio)}</p></div>
            </div>
            <div className="flex items-center justify-between rounded-xl px-4 py-2" style={{ backgroundColor: 'var(--gold-15)' }}>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Margen neto</span>
              <span className="text-sm font-bold" style={{ color: resumen.beneficio >= 0 ? '#4ADE80' : '#F87171' }}>{resumen.margen.toFixed(1)}%</span>
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'var(--muted)' }}>Gastos: modelos {money0(resumen.gModelos)} · agencia {money0(resumen.gAg)} · equipo {money0(resumen.gEq)}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Por modelo</p>
            <div className="rounded-2xl border divide-y overflow-hidden" style={card}>
              {modelos.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>No hay modelos.</p>}
              {modelos.map((m) => {
                const c = calc(finDe.get(m.id), m.id)
                const open = abierta === m.id
                return (
                  <div key={m.id} style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => abrir(m.id)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{m.model_name}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-sm font-semibold" style={{ color: c.beneficio >= 0 ? '#4ADE80' : '#F87171' }}>{money0(c.beneficio)}</span>
                        <ChevronDown size={15} style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                      </span>
                    </button>
                    {open && (
                      <div className="px-4 pb-5 pt-1 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Facturación del mes · en neto, tras la comisión de OnlyFans</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div><label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>Suscripciones</label><input type="number" min="0" step="0.01" value={subs} onChange={(e) => setSubs(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} /></div>
                            <div><label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>Pagos</label><input type="number" min="0" step="0.01" value={pagos} onChange={(e) => setPagos(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} /></div>
                            <div><label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>Propinas</label><input type="number" min="0" step="0.01" value={prop} onChange={(e) => setProp(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} /></div>
                            <div><label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>Pagos externos</label><input type="number" min="0" step="0.01" value={ext} onChange={(e) => setExt(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} /></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 items-end">
                          <div><label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>Tu comisión (%)</label><input type="number" min="0" max="100" step="0.1" value={pct} onChange={(e) => setPct(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} /></div>
                          <label className="flex items-center gap-2 text-xs pb-2" style={{ color: 'var(--foreground)' }}>
                            <input type="checkbox" checked={incSubs} onChange={(e) => setIncSubs(e.target.checked)} /> La comisión incluye suscripciones
                          </label>
                        </div>
                        <div className="rounded-xl p-3 text-xs space-y-1" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
                          <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Facturación bruta</span><span style={{ color: 'var(--foreground)' }}>{money(previewBruto)}</span></div>
                          <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Base de comisión</span><span style={{ color: 'var(--foreground)' }}>{money(previewBase)}</span></div>
                          <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Tu ingreso (comisión)</span><span style={{ color: 'var(--gold)', fontWeight: 600 }}>{money(previewComision)}</span></div>
                          <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Gastos de la modelo</span><span style={{ color: '#F87171' }}>−{money(c.gastos)}</span></div>
                          <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border)' }}><span style={{ color: 'var(--foreground)' }}>Beneficio neto</span><span style={{ color: (previewComision - c.gastos) >= 0 ? '#4ADE80' : '#F87171', fontWeight: 700 }}>{money(previewComision - c.gastos)}</span></div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Gastos de esta modelo</p>
                          <GastosBloque lista={gastosDeModelo(m.id)} ambito="modelo" modeloId={m.id} mes={mes} />
                        </div>
                        <button onClick={() => guardar(m.id)} disabled={saving} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
                          <Save size={15} /> {saving ? 'Guardando…' : 'Guardar facturación y comisión'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Gastos de la agencia</p>
            <div className="rounded-2xl border p-4" style={card}><GastosBloque lista={gastosAgencia} ambito="agencia" modeloId={null} mes={mes} /></div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Gastos de equipo</p>
            <div className="rounded-2xl border p-4" style={card}><GastosBloque lista={gastosEquipo} ambito="equipo" modeloId={null} mes={mes} /></div>
          </div>
        </div>
      )}
    </div>
  )
}
