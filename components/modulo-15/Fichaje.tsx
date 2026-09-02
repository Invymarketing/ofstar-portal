'use client'

import { useEffect, useMemo, useState } from 'react'
import { iniciarTurno, iniciarBreak, finalizarBreak, finalizarTurno } from '@/app/(dashboard)/modulo-15/actions'
import { LogIn, LogOut, Coffee, Play, Circle } from 'lucide-react'

interface Estado { enTurno: boolean; enBreak: boolean; inicioTurno: string | null; inicioBreak: string | null }
interface Periodo { inicio: string; fin: string | null }
interface Fila { user_id: string; inicio: string; fin: string | null }
interface Persona { id: string; full_name: string; role: string }

const fmt = (ms: number) => {
  if (ms < 0) ms = 0
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
}
const dur = (p: Periodo, now: number) => (p.fin ? +new Date(p.fin) : now) - +new Date(p.inicio)

export default function Fichaje({
  estado, misJornadas, misDescansos, esStaff, jornadas, descansos, personas,
}: {
  estado: Estado; misJornadas: Periodo[]; misDescansos: Periodo[]
  esStaff: boolean; jornadas: Fila[]; descansos: Fila[]; personas: Persona[]
}) {
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  async function accion(fn: () => Promise<void>) {
    setBusy(true)
    try { await fn(); window.location.reload() } finally { setBusy(false) }
  }

  // Resumen propio de hoy
  const miTrabajo = useMemo(() => {
    const bruto = misJornadas.reduce((a, j) => a + dur(j, now), 0)
    const brk = misDescansos.reduce((a, d) => a + dur(d, now), 0)
    return { trabajado: bruto - brk, brk }
  }, [misJornadas, misDescansos, now])

  // Cronómetro grande
  const cron = estado.enBreak && estado.inicioBreak
    ? now - +new Date(estado.inicioBreak)
    : estado.enTurno && estado.inicioTurno
      ? now - +new Date(estado.inicioTurno)
      : 0

  const nombre = new Map(personas.map((p) => [p.id, p.full_name]))

  // Panel staff: en línea + registro
  const enLinea = jornadas.filter((j) => !j.fin)
  const registro = useMemo(() => {
    const ids = [...new Set([...jornadas.map((j) => j.user_id), ...descansos.map((d) => d.user_id)])]
    return ids.map((id) => {
      const js = jornadas.filter((j) => j.user_id === id)
      const ds = descansos.filter((d) => d.user_id === id)
      const bruto = js.reduce((a, j) => a + dur(j, now), 0)
      const brk = ds.reduce((a, d) => a + dur(d, now), 0)
      const entrada = js.length ? js.map((j) => +new Date(j.inicio)).sort((a, b) => a - b)[0] : null
      const abierta = js.some((j) => !j.fin)
      const enBreak = ds.some((d) => !d.fin)
      return { id, nombre: nombre.get(id) ?? '—', entrada, trabajado: bruto - brk, brk, breaks: ds.length, abierta, enBreak }
    }).sort((a, b) => (b.entrada ?? 0) - (a.entrada ?? 0))
  }, [jornadas, descansos, now]) // eslint-disable-line react-hooks/exhaustive-deps

  const estadoTxt = estado.enBreak ? 'En break' : estado.enTurno ? 'Trabajando' : 'Fuera de turno'
  const estadoColor = estado.enBreak ? '#EAB308' : estado.enTurno ? '#22C55E' : '#6B6B80'

  return (
    <div className="space-y-6">
      {/* Reloj / controles */}
      <div className="rounded-2xl border p-6" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: estadoColor }} />
              <span className="text-sm font-medium" style={{ color: estadoColor }}>{estadoTxt}</span>
            </div>
            <p className="text-4xl font-bold tabular-nums" style={{ color: '#F0F0F5' }}>
              {estado.enTurno ? fmt(cron) : '00m 00s'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#6B6B80' }}>
              {estado.enBreak ? 'Tiempo en break' : estado.enTurno ? 'Tiempo en turno' : 'Inicia tu turno para empezar'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {!estado.enTurno && (
              <button onClick={() => accion(iniciarTurno)} disabled={busy}
                className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#22C55E', color: '#04120a' }}>
                <LogIn size={16} /> Iniciar turno
              </button>
            )}
            {estado.enTurno && !estado.enBreak && (
              <>
                <button onClick={() => accion(iniciarBreak)} disabled={busy}
                  className="flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.4)', color: '#EAB308' }}>
                  <Coffee size={16} /> Break
                </button>
                <button onClick={() => accion(finalizarTurno)} disabled={busy}
                  className="flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }}>
                  <LogOut size={16} /> Finalizar turno
                </button>
              </>
            )}
            {estado.enBreak && (
              <button onClick={() => accion(finalizarBreak)} disabled={busy}
                className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: '#22C55E', color: '#04120a' }}>
                <Play size={16} /> Volver del break
              </button>
            )}
          </div>
        </div>

        {/* Resumen propio */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-xl p-3" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E' }}>
            <p className="text-xs" style={{ color: '#6B6B80' }}>Trabajado hoy</p>
            <p className="text-lg font-bold" style={{ color: '#22C55E' }}>{fmt(miTrabajo.trabajado)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E' }}>
            <p className="text-xs" style={{ color: '#6B6B80' }}>En break hoy</p>
            <p className="text-lg font-bold" style={{ color: '#EAB308' }}>{fmt(miTrabajo.brk)}</p>
          </div>
        </div>
      </div>

      {/* Panel staff */}
      {esStaff && (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B6B80' }}>
              En línea ahora · {enLinea.length}
            </p>
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
              {enLinea.length === 0 ? (
                <p className="text-sm px-4 py-5 text-center" style={{ color: '#6B6B80' }}>Nadie en turno ahora mismo.</p>
              ) : enLinea.map((j, i) => {
                const enBreak = descansos.some((d) => d.user_id === j.user_id && !d.fin)
                return (
                  <div key={j.user_id + i} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: i ? '1px solid #1E1E2E' : 'none' }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: enBreak ? '#EAB308' : '#22C55E' }} />
                    <span className="flex-1 text-sm" style={{ color: '#F0F0F5' }}>{nombre.get(j.user_id) ?? '—'}</span>
                    <span className="text-xs" style={{ color: enBreak ? '#EAB308' : '#22C55E' }}>{enBreak ? 'En break' : 'Trabajando'}</span>
                    <span className="text-xs tabular-nums" style={{ color: '#6B6B80' }}>{fmt(now - +new Date(j.inicio))}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B6B80' }}>Registro (últimas 24h)</p>
            <div className="rounded-2xl border overflow-x-auto" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: '#6B6B80' }}>
                    <th className="text-left font-normal px-4 py-2 text-xs">Persona</th>
                    <th className="text-left font-normal px-4 py-2 text-xs">Entrada</th>
                    <th className="text-right font-normal px-4 py-2 text-xs">Trabajado</th>
                    <th className="text-right font-normal px-4 py-2 text-xs">Break</th>
                    <th className="text-right font-normal px-4 py-2 text-xs"># Breaks</th>
                    <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {registro.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                      <td className="px-4 py-2">{r.nombre}</td>
                      <td className="px-4 py-2" style={{ color: '#6B6B80' }}>
                        {r.entrada ? new Date(r.entrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: '#22C55E' }}>{fmt(r.trabajado)}</td>
                      <td className="px-4 py-2 text-right" style={{ color: '#EAB308' }}>{fmt(r.brk)}</td>
                      <td className="px-4 py-2 text-right" style={{ color: '#6B6B80' }}>{r.breaks}</td>
                      <td className="px-4 py-2 text-center text-xs">
                        {r.abierta ? (
                          <span className="inline-flex items-center gap-1" style={{ color: r.enBreak ? '#EAB308' : '#22C55E' }}>
                            <Circle size={8} fill="currentColor" /> {r.enBreak ? 'Break' : 'En línea'}
                          </span>
                        ) : <span style={{ color: '#6B6B80' }}>Cerrado</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
