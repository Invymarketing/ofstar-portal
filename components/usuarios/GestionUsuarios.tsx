'use client'

import { useState } from 'react'
import { crearUsuario, cambiarRol, toggleUsuario, eliminarUsuario, editarNombre, cambiarPassword } from '@/app/(dashboard)/usuarios/actions'
import { UserPlus, Trash2, Power, Pencil, Key, X } from 'lucide-react'

// Genera una contraseña fácil de dictar: sin caracteres confusos (0/O, 1/l/I)
function generarPassword(): string {
  const may = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const min = 'abcdefghijkmnpqrstuvwxyz'
  const num = '23456789'
  const pick = (s: string, n: number) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('')
  return pick(may, 1) + pick(min, 5) + pick(num, 3) + '!'
}

type Rol = 'admin' | 'manager' | 'team_leader' | 'chatter' | 'va' | 'modelo' | 'creativo' | 'marketing_manager' | 'content_manager' | 'director_creativo'
const ROLES: Rol[] = ['admin', 'manager', 'team_leader', 'chatter', 'va', 'modelo', 'creativo', 'marketing_manager', 'content_manager', 'director_creativo']
const ROL_LABEL: Record<Rol, string> = {
  admin: 'Admin', manager: 'Manager', team_leader: 'Team Leader',
  chatter: 'Chatter', va: 'VA', modelo: 'Modelo', creativo: 'Directora Creativa',
  marketing_manager: 'Marketing Manager', content_manager: 'Content Manager', director_creativo: 'Director Creativo',
}

interface Usuario { id: string; full_name: string; role: string; email: string; activo: boolean }
interface Ficha { id: string; nombre: string; vinculada: boolean }

export default function GestionUsuarios(
  { usuarios, miId, miRole, rolInicial, modoModelo, fichas }: { usuarios: Usuario[]; miId: string; miRole: string; rolInicial?: Rol; modoModelo?: boolean; fichas?: Ficha[] }
) {
  const esAdmin = miRole === 'admin'
  const esTeamLeader = miRole === 'team_leader'
  const rolesDisponibles: Rol[] = esAdmin
    ? ROLES
    : esTeamLeader
      ? ['chatter']
      : ROLES.filter((r) => r !== 'admin')

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Rol>(rolInicial ?? 'chatter')
  const [fichaId, setFichaId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const inputStyle = { backgroundColor: 'var(--field)', border: '1px solid var(--border)', color: 'var(--foreground)' } as const

  function genPassword() {
    setPassword(generarPassword())
  }

  // Aviso persistente con la nueva contraseña tras restablecer (para copiarla)
  const [pwdReset, setPwdReset] = useState<{ nombre: string; pwd: string } | null>(null)

  async function restablecer(u: Usuario) {
    if (!confirm(`¿Restablecer la contraseña de ${u.full_name}? Se generará una nueva.`)) return
    const nueva = generarPassword()
    try {
      await cambiarPassword(u.id, nueva)
      setPwdReset({ nombre: u.full_name, pwd: nueva })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al restablecer la contraseña')
    }
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(null); setSaving(true)
    try {
      await crearUsuario({ email, full_name: nombre, password, role, modeloFichaId: modoModelo ? (fichaId || undefined) : undefined })
      setOk(`✓ ${nombre} creado — contraseña: ${password}`)
      setNombre(''); setEmail(''); setPassword(''); setFichaId('')
      setTimeout(() => window.location.reload(), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  async function renombrar(u: Usuario) {
    const nuevo = window.prompt('Nuevo nombre:', u.full_name)
    if (nuevo == null) return
    if (!nuevo.trim()) { alert('El nombre no puede estar vacío'); return }
    try {
      await editarNombre(u.id, nuevo)
      window.location.reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al editar el nombre')
    }
  }

  return (
    <div className="space-y-6">
      {/* Alta */}
      <form onSubmit={crear}
        className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="Nombre completo" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="correo@ejemplo.com" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Contraseña temporal</label>
          <div className="flex gap-1">
            <input value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="mín. 6" />
            <button type="button" onClick={genPassword}
              className="rounded-lg px-2 text-xs" style={{ backgroundColor: 'var(--border)', color: 'var(--gold)' }}>gen</button>
          </div>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Rol</label>
          {esTeamLeader ? (
            <div className="w-full rounded-lg px-3 py-2 text-sm" style={{ ...inputStyle, color: 'var(--muted)' }}>Chatter</div>
          ) : modoModelo ? (
            <div className="w-full rounded-lg px-3 py-2 text-sm" style={{ ...inputStyle, color: 'var(--muted)' }}>Modelo</div>
          ) : (
            <select value={role} onChange={(e) => setRole(e.target.value as Rol)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              {rolesDisponibles.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </select>
          )}
        </div>

        {modoModelo && (
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Vincular con ficha de modelo</label>
            <select value={fichaId} onChange={(e) => setFichaId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
              <option value="">Sin vincular (lo hago después)</option>
              {(fichas ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}{f.vinculada ? ' — ya vinculada' : ''}</option>
              ))}
            </select>
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>La ficha donde tiene su horario. Así, al crearla, ya queda enlazada.</p>
          </div>
        )}

        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>
            <UserPlus size={15} /> {saving ? 'Creando…' : esTeamLeader ? 'Añadir chatter' : modoModelo ? 'Añadir modelo' : 'Añadir usuario'}
          </button>
          {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
          {ok && <span className="text-xs" style={{ color: '#22C55E' }}>{ok}</span>}
        </div>
      </form>

      {/* Aviso con la contraseña recién restablecida */}
      {pwdReset && (
        <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--gold-15)', borderColor: 'var(--gold-25)' }}>
          <Key size={16} style={{ color: 'var(--gold)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>
              Nueva contraseña de <b>{pwdReset.nombre}</b>: <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>{pwdReset.pwd}</span>
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>Cópiala y envíasela. No caduca; puede cambiarla luego. Este aviso solo se muestra ahora.</p>
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(pwdReset.pwd).catch(() => {}) }} className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--gold)', color: '#0D0D14' }}>Copiar</button>
          <button onClick={() => setPwdReset(null)} style={{ color: 'var(--muted)' }} title="Cerrar"><X size={16} /></button>
        </div>
      )}

      {/* Lista */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
          {usuarios.length} {esTeamLeader ? 'chatters' : modoModelo ? 'modelos' : 'usuarios'}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th className="text-left font-normal px-4 py-2 text-xs">Nombre</th>
              <th className="text-left font-normal px-4 py-2 text-xs">Email</th>
              <th className="text-left font-normal px-4 py-2 text-xs">Rol</th>
              <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
              <th className="text-right font-normal px-4 py-2 text-xs">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const bloqueado = esTeamLeader ? u.role !== 'chatter' : (!esAdmin && u.role === 'admin')
              return (
              <tr key={u.id} style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground)' }}>
                <td className="px-4 py-2">{u.full_name}</td>
                <td className="px-4 py-2" style={{ color: 'var(--muted)' }}>{u.email}</td>
                <td className="px-4 py-2">
                  {bloqueado || esTeamLeader ? (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{ROL_LABEL[u.role as Rol] ?? u.role}</span>
                  ) : (
                    <select
                      defaultValue={u.role}
                      onChange={async (e) => { await cambiarRol(u.id, e.target.value as Rol); window.location.reload() }}
                      className="rounded-lg px-2 py-1 text-xs"
                      style={{ backgroundColor: 'var(--field)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      {rolesDisponibles.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  <span className="text-xs" style={{ color: u.activo ? '#22C55E' : '#EF4444' }}>
                    {u.activo ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-3">
                    {!bloqueado && (
                      <button title="Editar nombre" onClick={() => renombrar(u)} style={{ color: 'var(--muted)' }}>
                        <Pencil size={15} />
                      </button>
                    )}
                    {!bloqueado && (
                      <button title="Restablecer contraseña" onClick={() => restablecer(u)} style={{ color: 'var(--muted)' }}>
                        <Key size={15} />
                      </button>
                    )}
                    {!bloqueado && (
                      <button title={u.activo ? 'Desactivar' : 'Activar'}
                        onClick={async () => { await toggleUsuario(u.id, !u.activo); window.location.reload() }}
                        style={{ color: u.activo ? '#EAB308' : '#22C55E' }}>
                        <Power size={15} />
                      </button>
                    )}
                    {u.id !== miId && !bloqueado && (
                      <button title="Eliminar"
                        onClick={async () => {
                          if (!confirm(`¿Eliminar a ${u.full_name}? Esto borra su cuenta.`)) return
                          await eliminarUsuario(u.id); window.location.reload()
                        }}
                        style={{ color: 'var(--muted)' }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
