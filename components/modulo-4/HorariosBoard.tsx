'use client'

import { useMemo, useState } from 'react'
import { Clock, Moon } from 'lucide-react'
import { actualizarChatterHorario } from '@/app/(dashboard)/modulo-4/actions'

interface Chatter {
  id: string; nombre: string; turno: string | null; equipo: number | null
  activo: boolean; dias_descanso: number[] | null
}

const TURNOS = [
  { key: 'Mañana', horas: '07:00 – 15:00', color: '#FBBF24' },
  { key: 'Tarde', horas: '15:00 – 23:00', color: '#F97316' },
  { key: 'Noche', horas: '23:00 – 07:00', color: '#6366F1' },
] as const
const EQUIPOS = [1, 2, 3, 4]

// 0=Domingo … 6=Sábado (como getDay de JS). Mostramos Lun→Dom.
const DIAS = [
  { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mié' }, { v: 4, l: 'Jue' },
  { v: 5, l: 'Vie' }, { v: 6, l: 'Sáb' }, { v: 0, l: 'Dom' },
] as const

// normaliza quitando acentos/espacios: 'Mañana' -> 'manana'
const norm = (s: string | null) =>
  (s ?? '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')

export default function HorariosBoard({ chatters }: { chatters: Chatter[] }) {
  const activos = useMemo(() => chatters.filter((c) => c.activo), [chatters])

  // estado local de descansos (edición optimista)
  const [descansos, setDescansos] = useState<Record<string, number[]>>(
    () => Object.fromEntries(activos.map((c) => [c.id, c.dias_descanso ?? []]))
  )

  function toggleDescanso(id: string, dia: number) {
    setDescansos((prev) => {
      const actuales = prev[id] ?? []
      const nuevos = actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia]
      actualizarChatterHorario(id, { dias_descanso: nuevos }).catch(() => {})
      return { ...prev, [id]: nuevos }
    })
  }

  function celda(equipo: number, turnoKey: string) {
    return activos.filter((c) => c.equipo === equipo && norm(c.turno) === norm(turnoKey))
  }
  const sinAsignar = activos.filter((c) => !c.equipo || !c.turno)

  // orden para la grilla semanal
  const ordenados = [...activos].sort((a, b) =>
    (a.equipo ?? 9) - (b.equipo ?? 9) || a.nombre.localeCompare(b.nombre))

  return (
    <div className="space-y-6">
      {/* ===== Tablero Equipo × Turno ===== */}
      <div>
        <div className="flex items-center gap-4 flex-wrap text-xs mb-3" style={{ color: '#6B6B80' }}>
          <span className="flex items-center gap-1"><Clock size={13} /> Turnos:</span>
          {TURNOS.map((t) => (
            <span key={t.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
              {t.key} <span style={{ color: '#4B4B5A' }}>({t.horas})</span>
            </span>
          ))}
        </div>

        <div className="rounded-2xl border overflow-x-auto" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: '#6B6B80', width: 90 }}>Equipo</th>
                {TURNOS.map((t) => (
                  <th key={t.key} className="px-4 py-3 text-left" style={{ borderLeft: '1px solid #1E1E2E' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>{t.key}</p>
                        <p className="text-[11px]" style={{ color: '#6B6B80' }}>{t.horas}</p>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EQUIPOS.map((e) => (
                <tr key={e} style={{ borderTop: '1px solid #1E1E2E' }}>
                  <td className="px-4 py-3 align-top">
                    <span className="text-sm font-semibold" style={{ color: '#C9A84C' }}>Equipo {e}</span>
                  </td>
                  {TURNOS.map((t) => {
                    const gente = celda(e, t.key)
                    return (
                      <td key={t.key} className="px-4 py-3 align-top" style={{ borderLeft: '1px solid #1E1E2E' }}>
                        {gente.length === 0 ? (
                          <span className="text-xs" style={{ color: '#3F3F4A' }}>—</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {gente.map((c) => (
                              <span key={c.id} className="text-xs px-2 py-1 rounded-lg w-fit"
                                style={{ backgroundColor: `${t.color}18`, color: '#F0F0F5', border: `1px solid ${t.color}44` }}>
                                {c.nombre}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Grilla semanal de descansos ===== */}
      <div>
        <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: '#6B6B80' }}>
          <Moon size={13} /> Descansos de la semana — haz clic en un día para marcarlo como libre
        </p>
        <div className="rounded-2xl border overflow-x-auto" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#6B6B80' }}>
                <th className="text-left px-4 py-2.5 text-xs font-normal" style={{ minWidth: 160 }}>Chatter</th>
                {DIAS.map((d) => (
                  <th key={d.v} className="px-2 py-2.5 text-center text-xs font-normal" style={{ borderLeft: '1px solid #1E1E2E' }}>{d.l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordenados.map((c) => {
                const off = descansos[c.id] ?? []
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                    <td className="px-4 py-2 text-sm">
                      {c.nombre}
                      <span className="text-[11px] ml-2" style={{ color: '#6B6B80' }}>
                        {c.equipo ? `E${c.equipo}` : ''}{c.turno ? ` · ${c.turno}` : ''}
                      </span>
                    </td>
                    {DIAS.map((d) => {
                      const libre = off.includes(d.v)
                      return (
                        <td key={d.v} className="px-2 py-2 text-center" style={{ borderLeft: '1px solid #1E1E2E' }}>
                          <button onClick={() => toggleDescanso(c.id, d.v)}
                            title={libre ? 'Descanso (clic para quitar)' : 'Trabaja (clic para marcar descanso)'}
                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors"
                            style={{
                              backgroundColor: libre ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.10)',
                              border: `1px solid ${libre ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.25)'}`,
                            }}>
                            {libre
                              ? <Moon size={13} style={{ color: '#EF4444' }} />
                              : <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22C55E' }} />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] mt-2" style={{ color: '#6B6B80' }}>
          🌙 rojo = descansa · punto verde = trabaja. Se guarda solo al hacer clic.
        </p>
      </div>

      {/* Sin asignar */}
      {sinAsignar.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: '#EAB308' }}>
            {sinAsignar.length} chatter{sinAsignar.length !== 1 ? 's' : ''} sin turno o equipo asignado
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sinAsignar.map((c) => (
              <span key={c.id} className="text-xs px-2 py-1 rounded-lg"
                style={{ backgroundColor: '#1E1E2E', color: '#8B8B9E' }}>{c.nombre}</span>
            ))}
          </div>
          <p className="text-[11px] mt-2" style={{ color: '#6B6B80' }}>
            Asígnalos en la pestaña “Chatters” con los menús de turno y equipo.
          </p>
        </div>
      )}
    </div>
  )
}
