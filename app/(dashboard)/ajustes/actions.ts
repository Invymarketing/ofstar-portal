'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function guardarIdioma(idioma: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  if (!['es', 'en', 'fr', 'de', 'it', 'ro'].includes(idioma)) throw new Error('Idioma no válido')
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ idioma }).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/ajustes')
}

export async function guardarNombre(nombre: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const n = nombre.trim()
  if (!n) throw new Error('El nombre no puede estar vacío')
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ full_name: n }).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/ajustes')
}

export async function cambiarPassword(nueva: string) {
  if (!nueva || nueva.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.auth.updateUser({ password: nueva })
  if (error) throw new Error(error.message)
}
