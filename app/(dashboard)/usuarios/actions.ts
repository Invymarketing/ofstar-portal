'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ROLES = ['admin', 'manager', 'team_leader', 'chatter', 'va', 'modelo'] as const
type Rol = (typeof ROLES)[number]

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || me.role !== 'admin') throw new Error('Solo un admin puede gestionar usuarios')
  return user
}

export async function crearUsuario(data: {
  email: string
  full_name: string
  password: string
  role: Rol
}) {
  await requireAdmin()
  const admin = createAdminClient()

  const email = data.email.trim().toLowerCase()
  const full_name = data.full_name.trim()
  if (!email || !full_name) throw new Error('Nombre y email son obligatorios')
  if (!data.password || data.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
  if (!ROLES.includes(data.role)) throw new Error('Rol inválido')

  // Crea la cuenta (el trigger handle_new_user crea el perfil con el rol del metadata)
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name, role: data.role },
  })
  if (error) throw new Error(error.message)
  const uid = created.user?.id
  if (!uid) throw new Error('No se pudo crear el usuario')

  // Asegura el rol y el nombre en el perfil
  await admin.from('profiles').update({ role: data.role, full_name }).eq('id', uid)

  // Si es chatter, crea/enlaza su ficha del Módulo 4
  if (data.role === 'chatter') {
    const { data: existente } = await admin.from('chatters').select('id').eq('profile_id', uid).maybeSingle()
    if (!existente) {
      await admin.from('chatters').insert({ nombre: full_name, profile_id: uid, activo: true })
    }
  }

  revalidatePath('/usuarios')
}

export async function cambiarRol(id: string, role: Rol) {
  await requireAdmin()
  if (!ROLES.includes(role)) throw new Error('Rol inválido')
  const admin = createAdminClient()
  await admin.from('profiles').update({ role }).eq('id', id)
  await admin.auth.admin.updateUserById(id, { user_metadata: { role } })
  revalidatePath('/usuarios')
}

export async function toggleUsuario(id: string, activar: boolean) {
  await requireAdmin()
  const admin = createAdminClient()
  // Banear = desactivar el login; 'none' = reactivar
  await admin.auth.admin.updateUserById(id, { ban_duration: activar ? 'none' : '876000h' })
  revalidatePath('/usuarios')
}

export async function eliminarUsuario(id: string) {
  const me = await requireAdmin()
  if (id === me.id) throw new Error('No puedes eliminarte a ti mismo')
  const admin = createAdminClient()
  // Suelta la ficha de chatter para no bloquear el borrado
  await admin.from('chatters').update({ profile_id: null }).eq('profile_id', id)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)
  revalidatePath('/usuarios')
}
