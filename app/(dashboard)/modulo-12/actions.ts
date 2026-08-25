'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Solo staff financiero puede registrar ventas manuales
async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager'].includes(me.role)) throw new Error('Sin permiso')
  return user
}

export async function registrarVenta(data: {
  modelo_id?: string | null
  fan_name?: string
  fan_id?: string
  monto_bruto: number
  tipo?: string
  fecha?: string
  estado?: 'Completado' | 'Reverso' | 'Revision'
}) {
  const user = await requireStaff()
  const admin = createAdminClient()

  if (!data.monto_bruto || data.monto_bruto <= 0) throw new Error('El monto debe ser mayor que 0')

  const { error } = await admin.from('ventas').insert({
    modelo_id: data.modelo_id || null,
    fan_name: data.fan_name?.trim() || null,
    fan_id: data.fan_id?.trim() || null,
    monto_bruto: data.monto_bruto,
    tipo: data.tipo?.trim() || 'manual',
    fecha: data.fecha || new Date().toISOString(),
    estado: data.estado || 'Completado',
    created_by: user.id,
    // infloww_id queda NULL → origen se marca 🖋️ Manual automáticamente
  })
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-3')
}

export async function eliminarVenta(id: string) {
  await requireStaff()
  const admin = createAdminClient()
  const { error } = await admin.from('ventas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-3')
}

// Mapear manualmente un creator de Infloww a un modelo (para las ventas "sin modelo")
export async function mapearCreator(modeloId: string, creatorId: string) {
  await requireStaff()
  const admin = createAdminClient()
  const { error: e1 } = await admin
    .from('modelos').update({ creator_id_infloww: creatorId }).eq('id', modeloId)
  if (e1) throw new Error(e1.message)
  // Reasigna las ventas huérfanas de ese creator
  const { error: e2 } = await admin
    .from('ventas').update({ modelo_id: modeloId })
    .eq('creator_id_infloww', creatorId).is('modelo_id', null)
  if (e2) throw new Error(e2.message)
  revalidatePath('/modulo-3')
}
