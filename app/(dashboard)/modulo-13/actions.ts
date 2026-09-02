'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) throw new Error('Sin permiso')
  return user
}

export async function crearMensaje(data: {
  modelo_id: string
  tipo: 'texto' | 'foto' | 'video'
  texto?: string
  archivo_url?: string
  fecha_programada: string
}) {
  const user = await requireStaff()
  const admin = createAdminClient()

  if (!data.modelo_id) throw new Error('Elige un modelo')
  if (data.tipo === 'texto' && !data.texto?.trim()) throw new Error('Escribe el texto del mensaje')
  if ((data.tipo === 'foto' || data.tipo === 'video') && !data.archivo_url?.trim())
    throw new Error('Falta la URL del archivo')

  const { error } = await admin.from('mensajes_telegram').insert({
    modelo_id: data.modelo_id,
    tipo: data.tipo,
    texto: data.texto?.trim() || null,
    archivo_url: data.archivo_url?.trim() || null,
    fecha_programada: data.fecha_programada || new Date().toISOString(),
    created_by: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-13')
}

export async function editarMensaje(id: string, data: {
  tipo?: 'texto' | 'foto' | 'video'
  texto?: string
  archivo_url?: string
  fecha_programada?: string
}) {
  await requireStaff()
  const admin = createAdminClient()
  const patch: Record<string, unknown> = {}
  if (data.tipo !== undefined) patch.tipo = data.tipo
  if (data.texto !== undefined) patch.texto = data.texto?.trim() || null
  if (data.archivo_url !== undefined) patch.archivo_url = data.archivo_url?.trim() || null
  if (data.fecha_programada !== undefined) patch.fecha_programada = data.fecha_programada
  // al editar, se vuelve a marcar como pendiente y se limpia el error
  patch.enviado = false
  patch.error = null
  const { error } = await admin.from('mensajes_telegram').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-13')
}

export async function eliminarMensaje(id: string) {
  await requireStaff()
  const admin = createAdminClient()
  const { error } = await admin.from('mensajes_telegram').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-13')
}
