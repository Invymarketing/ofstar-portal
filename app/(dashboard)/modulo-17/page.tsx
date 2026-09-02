import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CustomVC from '@/components/modulo-17/CustomVC'
import { PhoneCall } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Customs & Videollamadas — OF Star Management' }

export default async function Modulo17Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  if (!['admin', 'manager', 'team_leader', 'chatter'].includes(role)) redirect('/')
  const esStaff = ['admin', 'manager', 'team_leader'].includes(role)

  // Modelos para el formulario
  const { data: modelos } = await admin.from('modelos').select('id, model_name, activa').order('model_name')

  // Pedidos: el chatter ve los suyos; el staff ve todos
  let q = admin.from('custom_vc')
    .select('id, created_by, chatter_nombre, modelo_id, fan, tipo, precio, duracion, estado, notas, seguimiento, imagen_url, fecha, created_at')
    .order('created_at', { ascending: false }).limit(200)
  if (!esStaff) q = q.eq('created_by', user.id)
  const { data: customs, error } = await q

  const tablaLista = !error
  const modeloMap = new Map((modelos ?? []).map((m) => [m.id, m.model_name]))
  const customsView = (customs ?? []).map((c) => ({
    ...c,
    modelo: c.modelo_id ? (modeloMap.get(c.modelo_id) ?? null) : null,
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <PhoneCall size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Customs & Videollamadas</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
            {esStaff ? 'Pedidos registrados por los chatters' : 'Registra tu custom o videollamada — le llega al manager'}
          </p>
        </div>
      </div>

      {!tablaLista ? (
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}>
          <p className="text-sm font-medium" style={{ color: '#EAB308' }}>Migración pendiente</p>
          <p className="text-xs mt-1" style={{ color: '#6B6B80' }}>
            Ejecuta <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#1E1E2E' }}>024_custom_vc.sql</code> en Supabase para activar este módulo.
          </p>
        </div>
      ) : (
        <CustomVC
          esStaff={esStaff}
          modelos={(modelos ?? []).map((m) => ({ id: m.id, model_name: m.model_name }))}
          customs={customsView}
        />
      )}
    </div>
  )
}
