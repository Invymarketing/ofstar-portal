'use client'

import { useMemo, useState } from 'react'
import { guardarHorario } from '@/app/(dashboard)/modulo-17/actions'
import { Sun, Sunset, Moon, Check } from 'lucide-react'

type Turno = 'mañana' | 'tarde' | 'noche'

interface Persona {
  profile_id: string
  nombre: string
  tipo: 'Chatter' | 'VA'
  turno: string | null
  equipo: number | null
  dias_descanso: number[]
}

// getDay JS: 0=Dom .. 6=Sáb. Mostramos de Lunes a Domingo.
const DIAS = [
  { v: 1, l: 'L' }, { v: 2, l: 'M' }, { v: 3, l: 'X' }, { v: 4, l: 'J' },
  { v: 5, l: 'V' }, { v: 6, l: 'S' }, { v: 0, l: 'D' },
]

const TURNOS: { key: Turno; label: string; horas: string; icon: typeof Sun; color: string }[] = [
  { key: 'mañana', label: 'Mañana', horas: '7:00–15:00', icon: Sun, color: '#EAB308' },
  { key: 'tarde', label: 'Tarde', horas: '15:00–23:00', icon: Sunset, color: '#F97316' },
  { key: 'noche', label: 'Noche', horas: '23:00–7:00', icon: Moon, color: '#818CF8' },
]

export default function HorariosBoard({ roster }: { roster: Persona[] }) {
  const [filas, setFilas] = useState<Persona[]>(roster)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [okId, setOkId] = useState<string | null>(null)

  async function actualizar(profileId: string, cambios: Partial<Persona>) {
    const fila = filas.find((f) => f.profile_id === profileId)
    if (!fila) return
    const nueva = { ...fila, ...cambios }
    setFilas((prev) => prev.map((f) => (f.profile_id === profileId ? nueva : f)))
    setGuardando(profileId)
    try {
      await guardarHorario({
        profileId,
        turno: (nueva.turno as Turno) || null,
        equipo: nueva.equipo ?? null,
        dias_descanso: nueva.dias_descanso ?? [],
      })
      setOkId(profileId)
      setTimeout(() => setOkId((cur) => (cur === profileId ? null : cur)), 1500)
    } catch {
      // revertir en caso de error
      setFilas((prev) => prev.map((f) => (f.profile_id === profileId ? fila : f)))
    } finally {
      setGuardando((cur) => (cur === profileId ? null : cur))
    }
  }

  function toggleDia(fila: Persona, dia: number) {
    const set = new Set(fila.dias_descanso)
    if (set.has(dia)) set.delete(dia); else set.add(dia)
    actualizar(fila.profile_id, { dias_descanso: [...set] })
  }

  // Resumen por turno (para el tablero visual de arriba)
  const porTurno = useMemo(() => {
    const m = new Map<string, Persona[]>()
    for (const t of TURNOS) m.set(t.key, [])
    for (const f of filas) if (f.turno && m.has(f.turno)) m.get(f.turno)!.push(f)
    return m
  }, [filas])

  const sinAsignar = filas.filter((f) => !f.turno)

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  return (
    <div className="space-y-8">
      {/* Tablero por turno */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TURNOS.map((t) => {
          const Icon = t.icon
          const gente = porTurno.get(t.key) ?? []
          return (
            <div key={t.key} className="rounded-2xl border p-4" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${t.color}1A` }}>
                  <Icon size={15} style={{ color: t.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>{t.label}</p>
                  <p className="text-[11px]" style={{ color: '#6B6B80' }}>{t.horas} · {gente.length}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {gente.length === 0 ? (
                  <p className="text-xs" style={{ color: '#6B6B80' }}>Sin nadie asignado.</p>
                ) : gente.map((p) => (
                  <div key={p.profile_id} className="flex items-center justify-between text-sm">
                    <span style={{ color: '#F0F0F5' }}>
                      {p.nombre}
                      <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#1E1E2E', color: '#6B6B80' }}>{p.tipo}</span>
                    </span>
                    {p.equipo != null && (
                      <span className="text-[11px]" style={{ color: '#C9A84C' }}>E{p.equipo}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {sinAsignar.length > 0 && (
        <p className="text-xs" style={{ color: '#6B6B80' }}>
          Sin turno asignado: <span style={{ color: '#EAB308' }}>{sinAsignar.map((p) => p.nombre).join(' · ')}</span>
        </p>
      )}

      {/* Tabla de edición */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6B6B80', borderBottom: '1px solid #1E1E2E' }}>
          Asignar turno, equipo y descanso · {filas.length} personas
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#6B6B80' }}>
                <th className="text-left font-normal px-4 py-2 text-xs">Persona</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Turno</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Equipo</th>
                <th className="text-left font-normal px-4 py-2 text-xs">Días de descanso</th>
                <th className="px-2 py-2 text-xs"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.profile_id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {f.nombre}
                    <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#1E1E2E', color: '#6B6B80' }}>{f.tipo}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select value={f.turno ?? ''} onChange={(e) => actualizar(f.profile_id, { turno: e.target.value || null })}
                      className="rounded-lg px-2 py-1 text-xs" style={inputStyle}>
                      <option value="">—</option>
                      {TURNOS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <select value={f.equipo ?? ''} onChange={(e) => actualizar(f.profile_id, { equipo: e.target.value ? Number(e.target.value) : null })}
                      className="rounded-lg px-2 py-1 text-xs" style={inputStyle}>
                      <option value="">—</option>
                      {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Equipo {n}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {DIAS.map((d) => {
                        const activo = f.dias_descanso.includes(d.v)
                        return (
                          <button key={d.v} onClick={() => toggleDia(f, d.v)} title={activo ? 'Descansa' : 'Trabaja'}
                            className="w-6 h-6 rounded-md text-[11px] font-medium transition-colors"
                            style={{
                              backgroundColor: activo ? 'rgba(201,168,76,0.2)' : '#0D0D14',
                              border: `1px solid ${activo ? 'rgba(201,168,76,0.4)' : '#1E1E2E'}`,
                              color: activo ? '#C9A84C' : '#6B6B80',
                            }}>
                            {d.l}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center w-8">
                    {guardando === f.profile_id
                      ? <span className="text-[10px]" style={{ color: '#6B6B80' }}>…</span>
                      : okId === f.profile_id
                        ? <Check size={14} style={{ color: '#22C55E' }} />
                        : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px]" style={{ color: '#6B6B80' }}>
        Los cambios se guardan solos. Días marcados en dorado = descanso. Horas en hora Colombia.
      </p>
    </div>
  )
}
