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

// ----------------------------------------------------------------------------
// Búsqueda de ventas en TODO el histórico (no solo los 35 días precargados).
// Filtra por modelo, día y/o fan, y devuelve a qué chatter quedó asignada cada una.
export interface VentaBuscada {
  id: string
  fecha: string
  fan_name: string | null
  monto_bruto: number
  tipo: string | null
  estado: string
  modelo: string | null
  chatter: string | null
  chatter_id: string | null
}

export async function buscarVentas(filtros: {
  modelo_id?: string | null
  fecha?: string | null      // 'YYYY-MM-DD'
  fan?: string | null
}): Promise<VentaBuscada[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) throw new Error('Sin permiso')

  let q = admin.from('ventas')
    .select('id, fecha, fan_name, monto_bruto, tipo, estado, modelo_id, chatter_id')
    .order('fecha', { ascending: false })
    .limit(2000)

  if (filtros.modelo_id) q = q.eq('modelo_id', filtros.modelo_id)
  if (filtros.fan && filtros.fan.trim()) q = q.ilike('fan_name', `%${filtros.fan.trim()}%`)
  if (filtros.fecha) {
    const desde = new Date(`${filtros.fecha}T00:00:00.000Z`).toISOString()
    const hasta = new Date(new Date(desde).getTime() + 24 * 3600 * 1000).toISOString()
    q = q.gte('fecha', desde).lt('fecha', hasta)
  }

  const { data: ventas, error } = await q
  if (error) throw new Error(error.message)

  const [{ data: modelos }, { data: chatters }] = await Promise.all([
    admin.from('modelos').select('id, model_name'),
    admin.from('chatters').select('id, nombre'),
  ])
  const mMap = new Map((modelos ?? []).map((m) => [m.id, m.model_name]))
  const cMap = new Map((chatters ?? []).map((c) => [c.id, c.nombre]))

  return (ventas ?? []).map((v) => ({
    id: v.id,
    fecha: v.fecha,
    fan_name: v.fan_name,
    monto_bruto: Number(v.monto_bruto ?? 0),
    tipo: v.tipo,
    estado: v.estado,
    modelo: v.modelo_id ? (mMap.get(v.modelo_id) ?? null) : null,
    chatter: v.chatter_id ? (cMap.get(v.chatter_id) ?? null) : null,
    chatter_id: v.chatter_id ?? null,
  }))
}

// Reasigna manualmente una venta a otro chatter (o la deja sin asignar con null).
export async function reasignarVenta(ventaId: string, chatterId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) throw new Error('Sin permiso')

  const { error } = await admin.from('ventas').update({ chatter_id: chatterId }).eq('id', ventaId)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-3')
}
