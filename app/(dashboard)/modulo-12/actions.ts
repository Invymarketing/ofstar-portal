'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const money = (n: number) => '$' + Number(n || 0).toLocaleString('en-US')

async function chatterDelUsuario(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: ch } = await admin.from('chatters').select('id, nombre, equipo').eq('profile_id', userId).maybeSingle()
  if (ch) return ch
  const { data: prof } = await admin.from('profiles').select('full_name').eq('id', userId).single()
  if (prof?.full_name) {
    const { data: byName } = await admin.from('chatters').select('id, nombre, equipo').ilike('nombre', prof.full_name).maybeSingle()
    if (byName) return byName
  }
  return null
}

// Avisa a la team leader (del equipo del chatter, o a todas) de una venta por fuera a revisar.
async function avisarTeamLeader(admin: ReturnType<typeof createAdminClient>, chatterNombre: string, equipo: number | null, monto: number) {
  const { data: tls } = await admin.from('profiles').select('id, equipo').eq('role', 'team_leader')
  const match = (tls ?? []).filter((t) => equipo != null && t.equipo === equipo).map((t) => t.id)
  const dest = match.length ? match : (tls ?? []).map((t) => t.id)
  for (const uid of dest) {
    await admin.from('notifications').insert({
      user_id: uid,
      title: '💵 Venta por fuera para revisar',
      body: `${chatterNombre} registró una venta por fuera de ${money(monto)}. Revísala y confírmala en Ventas reportadas.`,
      module_id: 12,
      link: '/modulo-12',
    })
  }
}

export async function reportarVenta(data: {
  modelo_id?: string | null
  fan_name?: string
  monto: number
  tipo?: string
  fecha_venta?: string
  externa?: boolean
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
    tipo: data.externa ? 'externa' : (data.tipo?.trim() || 'tip'),
    fecha_venta: data.fecha_venta || new Date().toISOString(),
    estado: 'pendiente',
  })
  if (error) throw new Error(error.message)

  if (data.externa) {
    // No se cruza con Infloww: queda pendiente y se avisa a la team leader
    await avisarTeamLeader(admin, ch?.nombre ?? 'Un chatter', ch?.equipo ?? null, data.monto)
  } else {
    try { await admin.rpc('reconciliar_ventas') } catch { /* llega luego */ }
  }

  revalidatePath('/modulo-12')
}

// El staff registra una venta A NOMBRE de un chatter.
export async function reportarVentaComoStaff(data: {
  chatter_id: string
  modelo_id?: string | null
  fan_name?: string
  monto: number
  tipo?: string
  fecha_venta?: string
  externa?: boolean
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
    reported_by: ch.profile_id ?? user.id,
    chatter_id: ch.id,
    modelo_id: data.modelo_id || null,
    fan_name: data.fan_name?.trim() || null,
    monto: data.monto,
    tipo: data.externa ? 'externa' : (data.tipo?.trim() || 'tip'),
    fecha_venta: data.fecha_venta || new Date().toISOString(),
    estado: 'pendiente',
  })
  if (error) throw new Error(error.message)

  if (!data.externa) { try { await admin.rpc('reconciliar_ventas') } catch { /* nada */ } }

  revalidatePath('/modulo-12')
}

// El staff CONFIRMA manualmente un reporte (venta por fuera o una que no cruzó).
// Al confirmar, crea la venta atribuida al chatter para que cuente en totales/meta.
export async function confirmarReporte(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) throw new Error('Sin permiso')

  const { data: r } = await admin.from('ventas_reportadas')
    .select('estado, modelo_id, fan_name, monto, tipo, fecha_venta, chatter_id').eq('id', id).single()
  if (!r) throw new Error('Reporte no encontrado')
  if (r.estado === 'confirmada') { revalidatePath('/modulo-12'); return }

  const { error: vErr } = await admin.from('ventas').insert({
    infloww_id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    modelo_id: r.modelo_id || null,
    fan_name: r.fan_name || null,
    monto_bruto: r.monto,
    tipo: r.tipo || 'externa',
    estado: 'Completado',
    fecha: r.fecha_venta || new Date().toISOString(),
    chatter_id: r.chatter_id || null,
  })
  if (vErr) throw new Error(vErr.message)

  await admin.from('ventas_reportadas').update({ estado: 'confirmada' }).eq('id', id)
  revalidatePath('/modulo-12')
  revalidatePath('/modulo-3')
}

// Editar un reporte (el propio chatter, o el staff). Vuelve a cruzar con Infloww.
export async function editarReporte(id: string, data: {
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
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const esStaff = me && ['admin', 'manager', 'team_leader'].includes(me.role)

  const { data: rep } = await admin.from('ventas_reportadas').select('reported_by').eq('id', id).single()
  if (!rep || (!esStaff && rep.reported_by !== user.id)) throw new Error('Sin permiso para editar')

  const patch: Record<string, unknown> = {
    modelo_id: data.modelo_id || null,
    fan_name: data.fan_name?.trim() || null,
    monto: data.monto,
    estado: 'pendiente',
  }
  if (data.tipo) patch.tipo = data.tipo
  if (data.fecha_venta) patch.fecha_venta = data.fecha_venta

  const { error } = await admin.from('ventas_reportadas').update(patch).eq('id', id)
  if (error) throw new Error(error.message)

  if (data.tipo !== 'externa') { try { await admin.rpc('reconciliar_ventas') } catch { /* nada */ } }
  revalidatePath('/modulo-12')
}

export async function eliminarReporte(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const esStaff = me && ['admin', 'manager', 'team_leader'].includes(me.role)
  const q = admin.from('ventas_reportadas').delete().eq('id', id)
  if (!esStaff) q.eq('reported_by', user.id)
  const { error } = await q
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-12')
}
