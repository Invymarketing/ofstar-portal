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

const money = (n: number | null | undefined) =>
  n != null ? '$' + Number(n).toLocaleString('en-US') : '$0'

// El chatter registra un custom/videollamada → se guarda y le llega tarea al MANAGER.
export async function crearCustom(data: {
  modelo_id?: string | null
  fan?: string
  tipo?: string
  precio?: number | null
  duracion?: string
  fecha?: string
  notas?: string
  imagen_url?: string | null
}) {
  const user = await getUser()
  const admin = createAdminClient()

  const { data: me } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
  const nombre = me?.full_name ?? 'Chatter'

  if (!data.tipo) throw new Error('Elige el tipo (Videollamada o Custom)')
  if (!data.modelo_id) throw new Error('Elige la modelo')

  const { data: modelo } = await admin.from('modelos').select('model_name').eq('id', data.modelo_id).maybeSingle()
  const modeloNombre = modelo?.model_name ?? 'Modelo'

  const { data: creado, error } = await admin.from('custom_vc').insert({
    created_by: user.id,
    chatter_nombre: nombre,
    modelo_id: data.modelo_id,
    fan: data.fan?.trim() || null,
    tipo: data.tipo,
    precio: data.precio ?? null,
    duracion: data.duracion || null,
    fecha: data.fecha || null,
    notas: data.notas?.trim() || null,
    imagen_url: data.imagen_url || null,
    estado: 'Pendiente',
  }).select('id').single()
  if (error) throw new Error(error.message)

  // Tarea + notificación SOLO a managers (no admins)
  const { data: jefes } = await admin.from('profiles').select('id').eq('role', 'manager')

  const titulo = `Custom/VC: ${data.tipo} — ${modeloNombre} — ${money(data.precio)}`
  // Cuerpo con formato copiable (estilo mensaje)
  const descripcion = [
    '🔴 PENDIENTE',
    `👤 Chatter: ${nombre}`,
    `⚙️ Tipo: ${data.tipo}`,
    `👸 Modelo: ${modeloNombre}`,
    data.fan ? `🧑 Fan: ${data.fan}` : null,
    '📱 App: OnlyFans',
    `💰 Precio: ${money(data.precio)}`,
    data.duracion ? `⏱️ Duración: ${data.duracion}` : null,
    data.notas ? `📝 Notas: ${data.notas}` : null,
    data.imagen_url ? `🖼️ Referencia: ${data.imagen_url}` : null,
  ].filter(Boolean).join('\n')

  for (const j of jefes ?? []) {
    await admin.from('tareas').insert({
      titulo,
      descripcion,
      asignado_a: j.id,
      asignado_por: user.id,
    })
    await admin.from('notifications').insert({
      user_id: j.id,
      title: '📞 Nuevo Custom/Videollamada',
      body: `${nombre} registró: ${data.tipo} de ${modeloNombre} (${money(data.precio)}).`,
      module_id: 17,
      link: '/modulo-17',
    })
  }

  revalidatePath('/modulo-17')
  revalidatePath('/modulo-14')
  return creado?.id
}

// El staff actualiza estado / seguimiento
export async function actualizarCustom(id: string, data: { estado?: string; seguimiento?: string }) {
  const user = await getUser()
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) throw new Error('Sin permiso')

  const patch: Record<string, unknown> = {}
  if (data.estado !== undefined) patch.estado = data.estado
  if (data.seguimiento !== undefined) patch.seguimiento = data.seguimiento || null
  const { error } = await admin.from('custom_vc').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-17')
}
