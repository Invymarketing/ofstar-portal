'use client'

import { useMemo, useState } from 'react'
import { reportarVentaComoStaff, confirmarReporte } from '@/app/(dashboard)/modulo-12/actions'
import { PlusCircle, Check } from 'lucide-react'

interface Reporte {
  id: string; chatter: string; modelo: string | null
  fan_name: string | null; monto: number; tipo: string | null
  fecha_venta: string | null; estado: string | null; created_at: string
}
interface ChatterOpt { id: string; nombre: string }
interface ModeloOpt { id: string; model_name: string }

const money = (n: number) => '$' + Number(n || 0).toLocaleString('en-US')
const TIPOS = ['subscription', 'tip', 'message', 'custom', 'otro']

function colorEstado(e: string | null): string {
  const s = (e ?? '').toLowerCase()
  if (s.includes('valid') || s.includes('confirm') || s.includes('cruz')) return '#22C55E'
  if (s.includes('pend') || s.includes('revis')) return '#EAB308'
  if (s.includes('rechaz') || s.includes('no')) return '#EF4444'
  return '#6B6B80'
}

export default function SupervisionVentas(
  { reportes, chatters, modelos }: { reportes: Reporte[]; chatters: ChatterOpt[]; modelos: ModeloOpt[] }
) {
  const [chatter, setChatter] = useState('')
  const [abierto, setAbierto] = useState(false)

  // form
  const [fChatter, setFChatter] = useState('')
  const [fModelo, setFModelo] = useState('')
  const [fFan, setFFan] = useState('')
  const [fMonto, setFMonto] = useState('')
  const [fTipo, setFTipo] = useState('subscription')
  const [fFecha, setFFecha] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  const chattersEnLista = useMemo(
    () => [...new Set(reportes.map((r) => r.chatter).filter(Boolean))].sort(),
    [reportes]
  )
  const lista = useMemo(
    () => reportes.filter((r) => !chatter || r.chatter === chatter),
    [reportes, chatter]
  )
  const resumen = useMemo(() => {
    const m = new Map<string, { n: number; total: number; validados: number }>()
    for (const r of lista) {
      const cur = m.get(r.chatter) ?? { n: 0, total: 0, validados: 0 }
      cur.n += 1; cur.total += r.monto
      if (colorEstado(r.estado) === '#22C55E') cur.validados += 1
      m.set(r.chatter, cur)
    }
    return [...m.entries()].map(([nombre, x]) => ({ nombre, ...x })).sort((a, b) => b.total - a.total)
  }, [lista])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(false); setSaving(true)
    try {
      await reportarVentaComoStaff({
        chatter_id: fChatter,
        modelo_id: fModelo || null,
        fan_name: fFan,
        monto: Number(fMonto),
        tipo: fTipo,
        fecha_venta: fFecha || undefined,
      })
      setOk(true); setFFan(''); setFMonto(''); setFFecha('')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function confirmar(id: string) {
    if (!confirm('¿Confirmar esta venta? Se contará como venta del chatter.')) return
    await confirmarReporte(id)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Botón / formulario para añadir venta a nombre de un chatter */}
      <div>
        {!abierto ? (
          <button onClick={() => setAbierto(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
            <PlusCircle size={15} /> Añadir venta a un chatter
          </button>
        ) : (
          <form onSubmit={guardar} className="rounded-2xl border p-5" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>Añadir venta a un chatter</p>
              <button type="button" onClick={() => setAbierto(false)} className="text-xs" style={{ color: '#6B6B80' }}>Cerrar</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Chatter</label>
                <select value={fChatter} onChange={(e) => setFChatter(e.target.value)} required
                  className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
                  <option value="">Elige chatter…</option>
                  {chatters.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Modelo</label>
                <select value={fModelo} onChange={(e) => setFModelo(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
                  <option value="">—</option>
                  {modelos.map((m) => <option key={m.id} value={m.id}>{m.model_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Fan / usuario</label>
                <input value={fFan} onChange={(e) => setFFan(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="@usuario" />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Monto (US$)</label>
                <input type="number" step="0.01" value={fMonto} onChange={(e) => setFMonto(e.target.value)} required
                  className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="0" />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Tipo</label>
                <select value={fTipo} onChange={(e) => setFTipo(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Fecha (opcional)</label>
                <input type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
                <PlusCircle size={15} /> {saving ? 'Guardando…' : 'Registrar venta'}
              </button>
              {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
              {ok && <span className="text-xs" style={{ color: '#22C55E' }}>✓ Registrada</span>}
            </div>
          </form>
        )}
      </div>

      {/* Resumen por chatter */}
      {resumen.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {resumen.map((c) => (
            <div key={c.nombre} className="rounded-xl px-4 py-3" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
              <p className="text-xs mb-1 truncate" style={{ color: '#6B6B80' }}>{c.nombre}</p>
              <p className="text-lg font-bold" style={{ color: '#C9A84C' }}>{money(c.total)}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#6B6B80' }}>{c.n} reportes · {c.validados} validados</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtro por chatter */}
      <div className="flex items-center gap-3">
        <select value={chatter} onChange={(e) => setChatter(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E', color: chatter ? '#C9A84C' : '#8B8B9E' }}>
          <option value="">Todos los chatters</option>
          {chattersEnLista.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-xs" style={{ color: '#6B6B80' }}>{lista.length} reportes</span>
      </div>

      {/* Tabla de reportes */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        {lista.length === 0 ? (
          <p className="text-sm px-4 py-6 text-center" style={{ color: '#6B6B80' }}>Sin reportes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: '#6B6B80' }}>
                  <th className="text-left font-normal px-4 py-2 text-xs">Fecha</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Chatter</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Modelo</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Fan</th>
                  <th className="text-left font-normal px-4 py-2 text-xs">Tipo</th>
                  <th className="text-right font-normal px-4 py-2 text-xs">Monto</th>
                  <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: '#6B6B80' }}>
                      {new Date(r.fecha_venta ?? r.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-2" style={{ color: '#C9A84C' }}>{r.chatter}</td>
                    <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{r.modelo ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{r.fan_name ?? '—'}</td>
                    <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{r.tipo ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{money(r.monto)}</td>
                    <td className="px-4 py-2 text-center text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <span style={{ color: colorEstado(r.estado) }}>{r.estado ?? '—'}</span>
                        {colorEstado(r.estado) === '#EAB308' && (
                          <button onClick={() => confirmar(r.id)} title="Confirmar venta"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium"
                            style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                            <Check size={11} /> Confirmar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
