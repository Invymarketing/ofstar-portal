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

async function requireStaff() {
  const user = await getUser()
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) throw new Error('Sin permiso')
  return { user, nombre: me.full_name as string }
}

export async function crearTarea(data: {
  titulo: string
  descripcion?: string
  asignado_a: string
  fecha_limite?: string
}) {
  const { user, nombre } = await requireStaff()
  const admin = createAdminClient()
  if (!data.titulo.trim()) throw new Error('Escribe el título de la tarea')
  if (!data.asignado_a) throw new Error('Elige a quién se la asignas')

  const { error } = await admin.from('tareas').insert({
    titulo: data.titulo.trim(),
    descripcion: data.descripcion?.trim() || null,
    asignado_a: data.asignado_a,
    asignado_por: user.id,
    fecha_limite: data.fecha_limite || null,
  })
  if (error) throw new Error(error.message)

  // Notifica a la persona asignada
  await admin.from('notifications').insert({
    user_id: data.asignado_a,
    title: 'Nueva tarea asignada',
    body: `${nombre} te asignó: ${data.titulo.trim()}`,
    module_id: 14,
    link: '/modulo-14',
  })

  revalidatePath('/modulo-14')
}

export async function completarTarea(id: string) {
  const user = await getUser()
  const admin = createAdminClient()

  const { data: tarea } = await admin.from('tareas').select('titulo, asignado_a').eq('id', id).single()
  // Solo la persona asignada o el staff puede completar
  const { data: me } = await admin.from('profiles').select('role, full_name').eq('id', user.id).single()
  const esStaff = me && ['admin', 'manager', 'team_leader'].includes(me.role)
  if (!tarea || (tarea.asignado_a !== user.id && !esStaff)) throw new Error('Sin permiso')

  const { error } = await admin.from('tareas')
    .update({ estado: 'completada', completada_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)

  // Avisa a admins y managers que se completó
  const { data: jefes } = await admin.from('profiles').select('id').in('role', ['admin', 'manager'])
  const filas = (jefes ?? []).map((j) => ({
    user_id: j.id,
    title: 'Tarea completada',
    body: `${me?.full_name ?? 'Alguien'} completó: ${tarea.titulo}`,
    module_id: 14,
    link: '/modulo-14',
  }))
  if (filas.length > 0) await admin.from('notifications').insert(filas)

  revalidatePath('/modulo-14')
}

export async function reabrirTarea(id: string) {
  await requireStaff()
  const admin = createAdminClient()
  const { error } = await admin.from('tareas').update({ estado: 'pendiente', completada_at: null }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-14')
}

export async function eliminarTarea(id: string) {
  await requireStaff()
  const admin = createAdminClient()
  const { error } = await admin.from('tareas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-14')
}
