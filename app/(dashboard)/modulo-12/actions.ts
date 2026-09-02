'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Resuelve la identidad de chatter (roster) del usuario logueado:
// 1) por profile_id vinculado, 2) por nombre como respaldo.
async function chatterDelUsuario(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: ch } = await admin.from('chatters').select('id, nombre').eq('profile_id', userId).maybeSingle()
  if (ch) return ch
  const { data: prof } = await admin.from('profiles').select('full_name').eq('id', userId).single()
  if (prof?.full_name) {
    const { data: byName } = await admin.from('chatters').select('id, nombre').ilike('nombre', prof.full_name).maybeSingle()
    if (byName) return byName
  }
  return null
}

export async function reportarVenta(data: {
  modelo_id?: string | null
  fan_name?: string
  monto: number
  tipo?: string
  fecha_venta?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  if (!data.monto || data.monto <= 0) throw new Error('El monto debe ser mayor que 0')

  const admin = createAdminClient()
  const ch = await chatterDelUsuario(admin, user.id)

  const { error } = await admin.from('ventas_reportadas').insert({
    reported_by: user.id,
    chatter_id: ch?.id ?? null,
    modelo_id: data.modelo_id || null,
    fan_name: data.fan_name?.trim() || null,
    monto: data.monto,
    tipo: data.tipo?.trim() || 'subscription',
    fecha_venta: data.fecha_venta || new Date().toISOString(),
  })
  if (error) throw new Error(error.message)

  // Intenta cruzar de inmediato con las ventas de Infloww ya cargadas
  try { await admin.rpc('reconciliar_ventas') } catch { /* la venta puede llegar luego */ }

  revalidatePath('/modulo-12')
}

// El staff (manager / team leader / admin) registra una venta A NOMBRE de un chatter.
export async function reportarVentaComoStaff(data: {
  chatter_id: string
  modelo_id?: string | null
  fan_name?: string
  monto: number
  tipo?: string
  fecha_venta?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) throw new Error('Sin permiso')

  if (!data.chatter_id) throw new Error('Elige el chatter')
  if (!data.monto || data.monto <= 0) throw new Error('El monto debe ser mayor que 0')

  const { data: ch } = await admin.from('chatters').select('id, profile_id').eq('id', data.chatter_id).maybeSingle()
  if (!ch) throw new Error('Chatter no encontrado')

  const { error } = await admin.from('ventas_reportadas').insert({
    reported_by: ch.profile_id ?? user.id, // se atribuye al chatter si tiene login
    chatter_id: ch.id,
    modelo_id: data.modelo_id || null,
    fan_name: data.fan_name?.trim() || null,
    monto: data.monto,
    tipo: data.tipo?.trim() || 'subscription',
    fecha_venta: data.fecha_venta || new Date().toISOString(),
  })
  if (error) throw new Error(error.message)

  try { await admin.rpc('reconciliar_ventas') } catch { /* la venta puede llegar luego */ }

  revalidatePath('/modulo-12')
}

export async function eliminarReporte(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  // Solo puede borrar su propio reporte (o staff)
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const esStaff = me && ['admin', 'manager', 'team_leader'].includes(me.role)
  const q = admin.from('ventas_reportadas').delete().eq('id', id)
  if (!esStaff) q.eq('reported_by', user.id)
  const { error } = await q
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-12')
}
