import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MisVentas from '@/components/modulo-12/MisVentas'
import { DollarSign, Info } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Mis Ventas — OF Star Management' }

export default async function Modulo12Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('id', user.id).single()
  const role = profile?.role as UserRole
  if (!['admin', 'manager', 'team_leader', 'chatter'].includes(role)) redirect('/')

  // Modelos activas para el formulario
  const { data: modelos } = await admin
    .from('modelos').select('id, model_name, activa').eq('activa', true).order('model_name')

  // ¿Existe la tabla de reportes? (migración 008)
  const { data: reportes, error: repErr } = await admin
    .from('ventas_reportadas')
    .select('id, modelo_id, fan_name, monto, tipo, fecha_venta, estado, created_at')
    .eq('reported_by', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const tablesReady = !repErr

  const modeloMap = new Map((modelos ?? []).map((m) => [m.id, m.model_name]))
  const reportesView = (reportes ?? []).map((r) => ({
    ...r,
    monto: Number(r.monto ?? 0),
    modelo: r.modelo_id ? (modeloMap.get(r.modelo_id) ?? null) : null,
  }))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <DollarSign size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Mis Ventas</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
            Reporta tus ventas · se confirman automáticamente contra Infloww
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
              Ejecuta <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#1E1E2E' }}>supabase/migrations/008_ventas_chatter.sql</code> en Supabase.
            </p>
          </div>
        </div>
      ) : (
        <MisVentas
          modelos={(modelos ?? []).map((m) => ({ id: m.id, model_name: m.model_name }))}
          reportes={reportesView}
        />
      )}
    </div>
  )
}
