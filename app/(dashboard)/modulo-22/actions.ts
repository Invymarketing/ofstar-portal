'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Sin permiso')
  return admin
}

export async function guardarModelo(data: {
  modelo_id: string; mes: string
  suscripciones: number; pagos: number; propinas: number; pagos_externos: number
  comision_pct: number; incluye_subs: boolean
}) {
  const admin = await requireAdmin()
  const { error } = await admin.from('finanzas_modelo').upsert({
    modelo_id: data.modelo_id, mes: data.mes,
    suscripciones: data.suscripciones, pagos: data.pagos, propinas: data.propinas, pagos_externos: data.pagos_externos,
    comision_pct: data.comision_pct, incluye_subs: data.incluye_subs,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'modelo_id,mes' })
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-22')
}

export async function addGasto(data: { ambito: string; modelo_id: string | null; mes: string; concepto: string; monto: number }) {
  const admin = await requireAdmin()
  const { error } = await admin.from('finanzas_gastos').insert({
    ambito: data.ambito, modelo_id: data.modelo_id, mes: data.mes, concepto: data.concepto, monto: data.monto,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-22')
}

export async function delGasto(id: string) {
  const admin = await requireAdmin()
  const { error } = await admin.from('finanzas_gastos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-22')
}
