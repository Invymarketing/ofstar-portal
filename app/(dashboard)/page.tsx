import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAccessibleModules } from '@/lib/modules'
import { ROLE_LABELS } from '@/lib/roles'
import ModuleCard from '@/components/ui/ModuleCard'
import { ExternalLink, FileText, ListTodo } from 'lucide-react'
import type { UserRole } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name, content_snare_url, notion_url')
    .eq('id', user!.id)
    .single()

  const role = (profile?.role ?? 'chatter') as UserRole
  const fullName = profile?.full_name ?? ''
  const firstName = fullName.split(' ')[0]
  const modules = getAccessibleModules(role)

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: '#6B6B80' }}>{today}</p>
        <h1 className="text-2xl font-bold" style={{ color: '#F0F0F5' }}>
          Bienvenida{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6B6B80' }}>
          Accediendo como{' '}
          <span style={{ color: '#C9A84C' }} className="font-medium">
            {ROLE_LABELS[role]}
          </span>
        </p>
      </div>

      {/* Botones de acceso rápido — solo para modelos */}
      {role === 'modelo' && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B6B80' }}>
            Acceso rápido
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile?.content_snare_url ? (
              <a
                href={profile.content_snare_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:opacity-90 active:scale-[0.98] group"
                style={{ backgroundColor: 'rgba(201,168,76,0.08)', borderColor: 'rgba(201,168,76,0.25)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(201,168,76,0.15)' }}
                >
                  <FileText size={18} style={{ color: '#C9A84C' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#C9A84C' }}>Plantilla OF</p>
                  <p className="text-xs truncate" style={{ color: '#6B6B80' }}>Content Snare</p>
                </div>
                <ExternalLink size={14} style={{ color: '#C9A84C' }} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div
                className="flex items-center gap-4 p-4 rounded-2xl border opacity-40 cursor-default"
                style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E1E2E' }}>
                  <FileText size={18} style={{ color: '#6B6B80' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#6B6B80' }}>Plantilla OF</p>
                  <p className="text-xs" style={{ color: '#6B6B80' }}>Pendiente de configurar</p>
                </div>
              </div>
            )}

            {profile?.notion_url ? (
              <a
                href={profile.notion_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:opacity-90 active:scale-[0.98] group"
                style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#1E1E2E' }}
                >
                  <ListTodo size={18} style={{ color: '#F0F0F5' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#F0F0F5' }}>TO-DO Marketing</p>
                  <p className="text-xs truncate" style={{ color: '#6B6B80' }}>Notion</p>
                </div>
                <ExternalLink size={14} style={{ color: '#6B6B80' }} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div
                className="flex items-center gap-4 p-4 rounded-2xl border opacity-40 cursor-default"
                style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E1E2E' }}>
                  <ListTodo size={18} style={{ color: '#6B6B80' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#6B6B80' }}>TO-DO Marketing</p>
                  <p className="text-xs" style={{ color: '#6B6B80' }}>Pendiente de configurar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats — solo para roles internos */}
      {role !== 'modelo' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Modelos activas', value: '—', sub: 'Ver Módulo 5' },
            { label: 'Alertas pendientes', value: '—', sub: 'Ver Módulo 8' },
            { label: 'Ingresos del mes', value: '—', sub: 'Ver Módulo 3' },
            { label: 'Chatters en turno', value: '—', sub: 'Ver Módulo 4' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl px-4 py-4"
              style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}
            >
              <p className="text-xs mb-1" style={{ color: '#6B6B80' }}>{stat.label}</p>
              <p className="text-xl font-bold" style={{ color: '#F0F0F5' }}>{stat.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(107,107,128,0.6)' }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modules grid */}
      {modules.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>Módulos</h2>
            <span className="text-xs" style={{ color: '#6B6B80' }}>
              {modules.filter((m) => m.isBuilt).length} activos ·{' '}
              {modules.filter((m) => !m.isBuilt).length} próximamente
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((mod) => (
              <ModuleCard key={mod.id} module={mod} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
