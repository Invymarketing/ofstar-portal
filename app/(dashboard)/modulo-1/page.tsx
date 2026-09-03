import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ModelsList from '@/components/modulo-1/ModelsList'
import AddModelForm from '@/components/modulo-1/AddModelForm'
import ExecutionLog from '@/components/modulo-1/ExecutionLog'
import ExecuteAllButton from '@/components/modulo-1/ExecuteAllButton'
import { Bot, Info } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Bot de Contenido — Skeilab' }

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
            style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}
          >
            <Bot size={18} style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Bot de Contenido
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
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
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Ejecuta <code className="px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--border)' }}>supabase/migrations/003_bot_module.sql</code> en Supabase para activar este módulo.
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
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{s.label}</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: s.gold ? 'var(--gold)' : s.warn ? '#EAB308' : 'var(--foreground)' }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* How it works banner */}
          <div
            className="rounded-xl border px-4 py-3 mb-6 flex items-start gap-2.5"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <Info size={13} style={{ color: 'var(--muted)' }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
              Al pulsar <strong style={{ color: 'var(--foreground)' }}>Ejecutar</strong>, se crea un trabajo pendiente en el portal.
              La persona con la <strong style={{ color: 'var(--foreground)' }}>Chrome Extension</strong> debe ejecutarla en su máquina y después
              marcar el trabajo como completado aquí con los reels encontrados.
            </p>
          </div>

          {/* Models section */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Modelos en la automatización
              </h2>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {activeModels.length} activa{activeModels.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ModelsList models={models ?? []} />
            <AddModelForm />
          </section>

          {/* Execution log */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Log de ejecuciones
              </h2>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
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
