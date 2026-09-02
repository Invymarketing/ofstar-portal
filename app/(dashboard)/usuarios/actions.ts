'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ROLES = ['admin', 'manager', 'team_leader', 'chatter', 'va', 'modelo'] as const
type Rol = (typeof ROLES)[number]

// Admin, manager o team_leader pueden gestionar empleados. Devuelve el rol del actor.
// El team_leader queda limitado a chatters (se valida en cada acción).
async function requireGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) {
    throw new Error('No tienes permiso para gestionar empleados')
  }
  return { user, role: me.role as Rol }
}

export async function crearUsuario(data: {
  email: string
  full_name: string
  password: string
  role: Rol
}) {
  const { role: actorRole } = await requireGestor()
  const admin = createAdminClient()

  const email = data.email.trim().toLowerCase()
  const full_name = data.full_name.trim()
  if (!email || !full_name) throw new Error('Nombre y email son obligatorios')
  if (!data.password || data.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
  if (!ROLES.includes(data.role)) throw new Error('Rol inválido')
  if (data.role === 'admin' && actorRole !== 'admin') throw new Error('Solo un admin puede crear cuentas admin')
  // El team_leader solo puede crear chatters
  if (actorRole === 'team_leader' && data.role !== 'chatter') {
    throw new Error('Un team leader solo puede crear chatters')
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name, role: data.role },
  })
  if (error) throw new Error(error.message)
  const uid = created.user?.id
  if (!uid) throw new Error('No se pudo crear el usuario')

  await admin.from('profiles').update({ role: data.role, full_name }).eq('id', uid)

  if (data.role === 'chatter') {
    const { data: existente } = await admin.from('chatters').select('id').eq('profile_id', uid).maybeSingle()
    if (!existente) {
      await admin.from('chatters').insert({ nombre: full_name, profile_id: uid, activo: true })
    }
  }

  revalidatePath('/usuarios')
}

export async function cambiarRol(id: string, role: Rol) {
  const { role: actorRole } = await requireGestor()
  if (!ROLES.includes(role)) throw new Error('Rol inválido')
  const admin = createAdminClient()

  const { data: target } = await admin.from('profiles').select('role, full_name').eq('id', id).single()

  // Un manager no puede tocar cuentas admin ni ascender a nadie a admin
  if (actorRole !== 'admin' && (role === 'admin' || target?.role === 'admin')) {
    throw new Error('Solo un admin puede gestionar cuentas admin')
  }
  // El team_leader solo gestiona chatters y no puede cambiarles el rol a otra cosa
  if (actorRole === 'team_leader' && (target?.role !== 'chatter' || role !== 'chatter')) {
    throw new Error('Un team leader solo puede gestionar chatters')
  }

  await admin.from('profiles').update({ role }).eq('id', id)
  await admin.auth.admin.updateUserById(id, { user_metadata: { role } })

  // Si pasa a Chatter, crea su ficha en Control de Chatters (si no existe)
  if (role === 'chatter') {
    const { data: existente } = await admin.from('chatters').select('id').eq('profile_id', id).maybeSingle()
    if (!existente) {
      await admin.from('chatters').insert({ nombre: target?.full_name ?? 'Chatter', profile_id: id, activo: true })
    }
  }

  revalidatePath('/usuarios')
  revalidatePath('/modulo-4')
}

export async function toggleUsuario(id: string, activar: boolean) {
  const { role: actorRole } = await requireGestor()
  const admin = createAdminClient()
  const { data: target } = await admin.from('profiles').select('role').eq('id', id).single()
  if (actorRole !== 'admin' && target?.role === 'admin') {
    throw new Error('Solo un admin puede activar/desactivar cuentas admin')
  }
  if (actorRole === 'team_leader' && target?.role !== 'chatter') {
    throw new Error('Un team leader solo puede gestionar chatters')
  }
  await admin.auth.admin.updateUserById(id, { ban_duration: activar ? 'none' : '876000h' })
  revalidatePath('/usuarios')
}

export async function eliminarUsuario(id: string) {
  const { user, role: actorRole } = await requireGestor()
  if (id === user.id) throw new Error('No puedes eliminarte a ti mismo')
  const admin = createAdminClient()
  const { data: target } = await admin.from('profiles').select('role').eq('id', id).single()
  if (actorRole !== 'admin' && target?.role === 'admin') {
    throw new Error('Solo un admin puede eliminar cuentas admin')
  }
  if (actorRole === 'team_leader' && target?.role !== 'chatter') {
    throw new Error('Un team leader solo puede gestionar chatters')
  }
  await admin.from('chatters').update({ profile_id: null }).eq('profile_id', id)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)
  revalidatePath('/usuarios')
}
