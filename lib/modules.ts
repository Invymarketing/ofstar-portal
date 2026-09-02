import type { ModuleDefinition, UserRole } from '@/types'

// area: comercial | chatting | contenido | modelos | admin | topbar (topbar no sale en el sidebar)
export const MODULES: ModuleDefinition[] = [
  {
    id: 1, slug: 'modulo-1', name: 'Instagram',
    description: 'Panel del bot de Instagram: modelos, ejecución y logs.',
    icon: 'Bot', phase: 2, area: 'contenido',
    allowedRoles: ['admin', 'manager', 'creativo'], isBuilt: true,
  },
  {
    id: 2, slug: 'modulo-2', name: 'Analytics',
    description: 'Métricas de cuentas propias e inteligencia de competencia por nicho.',
    icon: 'BarChart3', phase: 3, area: 'contenido',
    allowedRoles: ['admin', 'manager', 'creativo'], isBuilt: true,
  },
  {
    id: 3, slug: 'modulo-3', name: 'Ventas',
    description: 'Caja, ventas de Infloww, comisiones y CRM de fans (ballenas).',
    icon: 'DollarSign', phase: 4, area: 'comercial',
    allowedRoles: ['admin', 'manager'], isBuilt: true,
  },
  {
    id: 4, slug: 'modulo-4', name: 'Chatters',
    description: 'Calidad, sanciones y horarios del equipo de chatting.',
    icon: 'MessageSquare', phase: 8, area: 'chatting',
    allowedRoles: ['admin', 'manager', 'team_leader'], isBuilt: true,
  },
  {
    id: 5, slug: 'modulo-5', name: 'Analytics de Cuentas',
    description: 'Registro semanal de seguidores y audiencia.',
    icon: 'BarChart3', phase: 5, area: 'modelos',
    allowedRoles: ['admin', 'manager', 'team_leader', 'va', 'modelo'], isBuilt: false,
  },
  {
    id: 6, slug: 'modulo-6', name: 'Reclutamiento',
    description: 'Kanban de candidatas: de la aplicación a la firma.',
    icon: 'Users', phase: 9, area: 'modelos',
    allowedRoles: ['admin', 'manager'], isBuilt: false,
  },
  {
    id: 7, slug: 'modulo-7', name: 'Calendario',
    description: 'Control de entregas semanales y puntualidad por modelo.',
    icon: 'Calendar', phase: 6, area: 'contenido',
    allowedRoles: ['admin', 'manager', 'team_leader', 'modelo'], isBuilt: false,
  },
  {
    id: 8, slug: 'modulo-8', name: 'Alertas',
    description: 'Detección automática de situaciones críticas.',
    icon: 'Bell', phase: 7, area: 'admin',
    allowedRoles: ['admin', 'manager', 'team_leader'], isBuilt: false,
  },
  {
    id: 9, slug: 'modulo-9', name: 'Biblioteca',
    description: 'Repositorio de contexto por modelo: referencias, paleta, tono.',
    icon: 'FolderOpen', phase: 10, area: 'contenido',
    allowedRoles: ['admin', 'manager'], isBuilt: false,
  },
  {
    id: 10, slug: 'modulo-10', name: 'Onboarding',
    description: 'Flujo automático al dar de alta una nueva modelo.',
    icon: 'UserPlus', phase: 11, area: 'modelos',
    allowedRoles: ['admin', 'manager'], isBuilt: false,
  },
  {
    id: 11, slug: 'modulo-11', name: 'Comunicación',
    description: 'Tablón de briefings con confirmación de lectura.',
    icon: 'Megaphone', phase: 12, area: 'admin',
    allowedRoles: ['admin', 'manager', 'team_leader', 'va', 'modelo'], isBuilt: false,
  },
  {
    id: 12, slug: 'modulo-12', name: 'Mis Ventas',
    description: 'Reporta tus ventas y mira tu meta de la quincena.',
    icon: 'DollarSign', phase: 8, area: 'comercial',
    allowedRoles: ['admin', 'manager', 'team_leader', 'chatter'], isBuilt: true,
  },
  {
    id: 13, slug: 'modulo-13', name: 'Telegram',
    description: 'Programa mensajes (texto, foto o video) al grupo de cada modelo.',
    icon: 'Megaphone', phase: 12, area: 'contenido',
    allowedRoles: ['admin', 'manager'], isBuilt: true,
  },
  {
    id: 14, slug: 'modulo-14', name: 'Tareas',
    description: 'Asigna tareas a tu equipo, con notificaciones y seguimiento.',
    icon: 'Calendar', phase: 7, area: 'topbar',
    allowedRoles: ['admin', 'manager', 'team_leader', 'chatter', 'va', 'modelo'], isBuilt: true,
  },
  {
    id: 15, slug: 'modulo-15', name: 'Turnos',
    description: 'Fichaje de turnos y breaks, con panel de tiempo en vivo.',
    icon: 'Calendar', phase: 8, area: 'chatting',
    allowedRoles: ['admin', 'manager', 'team_leader', 'chatter', 'va'], isBuilt: true,
  },
  {
    id: 16, slug: 'modulo-16', name: 'Rendimiento',
    description: 'Avance de meta de cada chatter y rendimiento por hora.',
    icon: 'BarChart3', phase: 8, area: 'chatting',
    allowedRoles: ['admin', 'manager', 'team_leader'], isBuilt: true,
  },
]

export function getAccessibleModules(role: UserRole): ModuleDefinition[] {
  if (role === 'admin') return MODULES
  return MODULES.filter((m) => m.allowedRoles.includes(role))
}
