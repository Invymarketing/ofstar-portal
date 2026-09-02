'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return user
}

// Devuelve la jornada abierta del usuario (o null)
async function jornadaAbierta(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.from('jornadas')
    .select('id').eq('user_id', userId).is('fin', null).order('inicio', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

export async function iniciarTurno() {
  const user = await getUser()
  const admin = createAdminClient()
  const abierta = await jornadaAbierta(admin, user.id)
  if (abierta) throw new Error('Ya tienes un turno abierto')
  const { error } = await admin.from('jornadas').insert({ user_id: user.id })
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-15')
}

export async function iniciarBreak() {
  const user = await getUser()
  const admin = createAdminClient()
  const jornada = await jornadaAbierta(admin, user.id)
  if (!jornada) throw new Error('No tienes un turno abierto')
  const { data: b } = await admin.from('descansos')
    .select('id').eq('jornada_id', jornada.id).is('fin', null).limit(1)
  if (b && b.length > 0) throw new Error('Ya estás en break')
  const { error } = await admin.from('descansos').insert({ jornada_id: jornada.id, user_id: user.id })
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-15')
}

export async function finalizarBreak() {
  const user = await getUser()
  const admin = createAdminClient()
  const jornada = await jornadaAbierta(admin, user.id)
  if (!jornada) throw new Error('No tienes un turno abierto')
  const { error } = await admin.from('descansos')
    .update({ fin: new Date().toISOString() })
    .eq('jornada_id', jornada.id).is('fin', null)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-15')
}

export async function finalizarTurno(nota?: string) {
  const user = await getUser()
  const admin = createAdminClient()
  const jornada = await jornadaAbierta(admin, user.id)
  if (!jornada) throw new Error('No tienes un turno abierto')
  // Cierra cualquier break abierto
  await admin.from('descansos').update({ fin: new Date().toISOString() })
    .eq('jornada_id', jornada.id).is('fin', null)
  const { error } = await admin.from('jornadas').update({ fin: new Date().toISOString() }).eq('id', jornada.id)
  if (error) throw new Error(error.message)
  // Novedad de fin de turno (opcional)
  if (nota && nota.trim()) {
    await admin.from('handoffs').insert({ user_id: user.id, texto: nota.trim() })
  }
  revalidatePath('/modulo-15')
}

export async function eliminarHandoff(id: string) {
  const user = await getUser()
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) throw new Error('Sin permiso')
  const { error } = await admin.from('handoffs').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-15')
}
