import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProgramadorTelegram from '@/components/modulo-13/ProgramadorTelegram'
import { Megaphone, Info } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Programación de Telegram — OF Star Management' }

export default async function Modulo13Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  if (!['admin', 'manager', 'team_leader'].includes(role)) redirect('/')

  const { data: modelos } = await admin
    .from('modelos').select('id, model_name, activa, telegram_group_id').eq('activa', true).order('model_name')

  const { data: mensajes, error } = await admin
    .from('mensajes_telegram')
    .select('id, modelo_id, tipo, texto, archivo_url, fecha_programada, enviado, enviado_at, error')
    .order('fecha_programada', { ascending: false })
    .limit(60)

  const tablesReady = !error
  const modeloMap = new Map((modelos ?? []).map((m) => [m.id, m.model_name]))
  const mensajesView = (mensajes ?? []).map((m) => ({
    ...m,
    modelo: m.modelo_id ? (modeloMap.get(m.modelo_id) ?? null) : null,
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <Megaphone size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Programación de Telegram</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
            Programa mensajes (texto, foto o video) al grupo de cada modelo
          </p>
        </div>
      </div>

      {!tablesReady ? (
        <div className="rounded-2xl border p-5 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}>
          <Info size={16} style={{ color: '#EAB308' }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#EAB308' }}>Migración pendiente</p>
            <p className="text-xs" style={{ color: '#6B6B80' }}>
              Ejecuta <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#1E1E2E' }}>supabase/migrations/013_mensajes_telegram.sql</code> en Supabase.
            </p>
          </div>
        </div>
      ) : (
        <ProgramadorTelegram
          modelos={(modelos ?? []).map((m) => ({ id: m.id, model_name: m.model_name, tiene_grupo: !!m.telegram_group_id }))}
          mensajes={mensajesView}
        />
      )}
    </div>
  )
}
