'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function ctx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return { admin, uid: user.id, role: (profile?.role ?? '') as string }
}

async function puedeEditar(admin: ReturnType<typeof createAdminClient>, id: string, uid: string, role: string) {
  if (['admin', 'manager'].includes(role)) return true
  if (role === 'modelo') {
    const { data } = await admin.from('modelo_tareas').select('profile_id').eq('id', id).single()
    return data?.profile_id === uid
  }
  return false
}

export async function addTarea(profile_id: string, fecha: string, titulo: string) {
  const { admin, uid, role } = await ctx()
  if (!['admin', 'manager'].includes(role)) throw new Error('Sin permiso')
  const t = titulo.trim()
  if (!t) throw new Error('Título vacío')
  const { error } = await admin.from('modelo_tareas').insert({ profile_id, fecha, titulo: t, created_by: uid })
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-23')
}

export async function delTarea(id: string) {
  const { admin, role } = await ctx()
  if (!['admin', 'manager'].includes(role)) throw new Error('Sin permiso')
  const { error } = await admin.from('modelo_tareas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-23')
}

export async function toggleTarea(id: string, completada: boolean) {
  const { admin, uid, role } = await ctx()
  if (!(await puedeEditar(admin, id, uid, role))) throw new Error('Sin permiso')
  const { error } = await admin.from('modelo_tareas').update({ completada, completada_at: completada ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-23')
}

export async function moverTarea(id: string, fecha: string) {
  const { admin, uid, role } = await ctx()
  if (!(await puedeEditar(admin, id, uid, role))) throw new Error('Sin permiso')
  const { error } = await admin.from('modelo_tareas').update({ fecha }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-23')
}
