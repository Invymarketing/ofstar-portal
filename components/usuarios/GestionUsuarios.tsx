'use client'

import { useState } from 'react'
import { crearUsuario, cambiarRol, toggleUsuario, eliminarUsuario } from '@/app/(dashboard)/usuarios/actions'
import { UserPlus, Trash2, Power } from 'lucide-react'

type Rol = 'admin' | 'manager' | 'team_leader' | 'chatter' | 'va' | 'modelo'
const ROLES: Rol[] = ['admin', 'manager', 'team_leader', 'chatter', 'va', 'modelo']
const ROL_LABEL: Record<Rol, string> = {
  admin: 'Admin', manager: 'Manager', team_leader: 'Team Leader',
  chatter: 'Chatter', va: 'VA', modelo: 'Modelo',
}

interface Usuario { id: string; full_name: string; role: string; email: string; activo: boolean }

export default function GestionUsuarios(
  { usuarios, miId, miRole }: { usuarios: Usuario[]; miId: string; miRole: string }
) {
  const esAdmin = miRole === 'admin'
  const rolesDisponibles = esAdmin ? ROLES : ROLES.filter((r) => r !== 'admin')

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Rol>('chatter')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const inputStyle = { backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' } as const

  function genPassword() {
    const p = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!'
    setPassword(p)
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(null); setSaving(true)
    try {
      await crearUsuario({ email, full_name: nombre, password, role })
      setOk(`✓ ${nombre} creado — contraseña: ${password}`)
      setNombre(''); setEmail(''); setPassword('')
      setTimeout(() => window.location.reload(), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Alta */}
      <form onSubmit={crear}
        className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
        style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="Nombre completo" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="correo@ejemplo.com" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Contraseña temporal</label>
          <div className="flex gap-1">
            <input value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} placeholder="mín. 6" />
            <button type="button" onClick={genPassword}
              className="rounded-lg px-2 text-xs" style={{ backgroundColor: '#1E1E2E', color: '#C9A84C' }}>gen</button>
          </div>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#6B6B80' }}>Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Rol)}
            className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle}>
            {rolesDisponibles.map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#C9A84C', color: '#0D0D14' }}>
            <UserPlus size={15} /> {saving ? 'Creando…' : 'Añadir usuario'}
          </button>
          {error && <span className="text-xs" style={{ color: '#EF4444' }}>{error}</span>}
          {ok && <span className="text-xs" style={{ color: '#22C55E' }}>{ok}</span>}
        </div>
      </form>

      {/* Lista */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: '#6B6B80', borderBottom: '1px solid #1E1E2E' }}>
          {usuarios.length} usuarios
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: '#6B6B80' }}>
              <th className="text-left font-normal px-4 py-2 text-xs">Nombre</th>
              <th className="text-left font-normal px-4 py-2 text-xs">Email</th>
              <th className="text-left font-normal px-4 py-2 text-xs">Rol</th>
              <th className="text-center font-normal px-4 py-2 text-xs">Estado</th>
              <th className="text-right font-normal px-4 py-2 text-xs">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const bloqueado = !esAdmin && u.role === 'admin' // manager no toca cuentas admin
              return (
              <tr key={u.id} style={{ borderTop: '1px solid #1E1E2E', color: '#F0F0F5' }}>
                <td className="px-4 py-2">{u.full_name}</td>
                <td className="px-4 py-2" style={{ color: '#6B6B80' }}>{u.email}</td>
                <td className="px-4 py-2">
                  {bloqueado ? (
                    <span className="text-xs" style={{ color: '#6B6B80' }}>{ROL_LABEL[u.role as Rol] ?? u.role}</span>
                  ) : (
                    <select
                      defaultValue={u.role}
                      onChange={async (e) => { await cambiarRol(u.id, e.target.value as Rol); window.location.reload() }}
                      className="rounded-lg px-2 py-1 text-xs"
                      style={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', color: '#F0F0F5' }}>
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
                        style={{ color: '#6B6B80' }}>
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
