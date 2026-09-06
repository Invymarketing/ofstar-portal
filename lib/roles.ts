import type { UserRole } from '@/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Manager',
  creativo: 'Directora Creativa',
  team_leader: 'Team Leader',
  chatter: 'Chatter',
  va: 'Asistente Virtual',
  modelo: 'Modelo',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'text-gold border-gold',
  manager: 'text-purple-400 border-purple-400',
  creativo: 'text-pink-400 border-pink-400',
  team_leader: 'text-blue-400 border-blue-400',
  chatter: 'text-green-400 border-green-400',
  va: 'text-yellow-400 border-yellow-400',
  modelo: 'text-pink-400 border-pink-400',
}

// Routes each role can access (beyond the dashboard home)
export const ROLE_ACCESS: Record<UserRole, string[]> = {
  admin: ['*'],
  creativo: ['/modulo-1', '/modulo-2', '/modelos'],
  manager: [
    '/modulo-1', '/modulo-2', '/modulo-3', '/modulo-4',
    '/modulo-5', '/modulo-6', '/modulo-7', '/modulo-8',
    '/modulo-9', '/modulo-10', '/modulo-11', '/modulo-19',
  ],
  team_leader: ['/modulo-4', '/modulo-7', '/modulo-8', '/modulo-11'],
  chatter: ['/modulo-4'],
  va: ['/modulo-5', '/modulo-19'],
  modelo: [],
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (role === 'admin') return true
  if (pathname === '/') return true
  if (pathname.startsWith('/ajustes')) return true
  if (pathname.startsWith('/modulo-23') && ['admin', 'manager', 'modelo'].includes(role)) return true
  const allowed = ROLE_ACCESS[role] || []
  return allowed.some((path) => pathname.startsWith(path))
}
