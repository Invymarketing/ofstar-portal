import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ModelsList from '@/components/modulo-1/ModelsList'
import AddModelForm from '@/components/modulo-1/AddModelForm'
import ExecutionLog from '@/components/modulo-1/ExecutionLog'
import ExecuteAllButton from '@/components/modulo-1/ExecuteAllButton'
import { Bot, Info } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Bot de Contenido — OF Star Management' }

export default async function Modulo1Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single()

  const role = profile?.role as UserRole
  if (!['admin', 'manager', 'va'].includes(role)) redirect('/')

  // Fetch models and executions
  const [{ data: models }, { data: executions }] = await Promise.all([
    admin
      .from('bot_models')
      .select('*')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: true }),
    admin
      .from('bot_executions')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(30),
  ])

  const activeModels = (models ?? []).filter((m) => m.is_active)
  const pendingCount = (executions ?? []).filter((e) => e.status === 'pending').length

  // Si las tablas no existen aún (migration pendiente)
  const tablesReady = models !== null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <Bot size={18} style={{ color: '#C9A84C' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>
              Bot de Contenido
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
              Panel de control de la automatización de reels
            </p>
          </div>
        </div>

        {tablesReady && (
          <ExecuteAllButton activeCount={activeModels.length} />
        )}
      </div>

      {/* Migration pending banner */}
      {!tablesReady && (
        <div
          className="rounded-2xl border p-5 mb-8 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}
        >
          <Info size={16} style={{ color: '#EAB308' }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#EAB308' }}>
              Migración pendiente
            </p>
            <p className="text-xs" style={{ color: '#6B6B80' }}>
              Ejecuta <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#1E1E2E' }}>supabase/migrations/003_bot_module.sql</code> en Supabase para activar este módulo.
            </p>
          </div>
        </div>
      )}

      {tablesReady && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Total modelos', value: (models ?? []).length },
              { label: 'Activas', value: activeModels.length, gold: true },
              { label: 'Trabajos pendientes', value: pendingCount, warn: pendingCount > 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl px-4 py-3"
                style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}
              >
                <p className="text-xs mb-1" style={{ color: '#6B6B80' }}>{s.label}</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: s.gold ? '#C9A84C' : s.warn ? '#EAB308' : '#F0F0F5' }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* How it works banner */}
          <div
            className="rounded-xl border px-4 py-3 mb-6 flex items-start gap-2.5"
            style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}
          >
            <Info size={13} style={{ color: '#6B6B80' }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: '#6B6B80' }}>
              Al pulsar <strong style={{ color: '#F0F0F5' }}>Ejecutar</strong>, se crea un trabajo pendiente en el portal.
              La persona con la <strong style={{ color: '#F0F0F5' }}>Chrome Extension</strong> debe ejecutarla en su máquina y después
              marcar el trabajo como completado aquí con los reels encontrados.
            </p>
          </div>

          {/* Models section */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>
                Modelos en la automatización
              </h2>
              <span className="text-xs" style={{ color: '#6B6B80' }}>
                {activeModels.length} activa{activeModels.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ModelsList models={models ?? []} />
            <AddModelForm />
          </section>

          {/* Execution log */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>
                Log de ejecuciones
              </h2>
              <span className="text-xs" style={{ color: '#6B6B80' }}>
                Últimas {(executions ?? []).length}
              </span>
            </div>
            <ExecutionLog executions={executions ?? []} />
          </section>
        </>
      )}
    </div>
  )
}
