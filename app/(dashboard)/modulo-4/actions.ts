'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// --- Solo staff (admin / manager / team_leader) puede registrar errores ---
async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  // Leemos el rol con el cliente admin (salta RLS), igual que en page.tsx
  const admin = createAdminClient()
  const { data: me } = await admin
    .from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) {
    throw new Error('Sin permiso')
  }
  return user
}

// ============================================================
// CHATTERS
// ============================================================
export async function addChatter(data: { nombre: string; grupo?: string; turno?: string; equipo?: number | null }) {
  await requireStaff()
  const admin = createAdminClient()
  if (!data.nombre.trim()) throw new Error('El nombre es obligatorio')
  const { error } = await admin.from('chatters').insert({
    nombre: data.nombre.trim(),
    grupo: data.grupo?.trim() || null,
    turno: data.turno?.trim() || null,
    equipo: data.equipo ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-4')
}

export async function toggleChatter(id: string, activo: boolean) {
  await requireStaff()
  const admin = createAdminClient()
  const { error } = await admin.from('chatters').update({ activo }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-4')
}

export async function deleteChatter(id: string) {
  await requireStaff()
  const admin = createAdminClient()
  const { error } = await admin.from('chatters').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-4')
}

// Editar turno y/o equipo de un chatter
export async function actualizarChatterHorario(
  id: string,
  data: { turno?: string | null; equipo?: number | null }
) {
  await requireStaff()
  const admin = createAdminClient()
  const patch: Record<string, unknown> = {}
  if (data.turno !== undefined) patch.turno = data.turno || null
  if (data.equipo !== undefined) patch.equipo = data.equipo ?? null
  const { error } = await admin.from('chatters').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-4')
}

// ============================================================
// ERRORES
// ============================================================
export async function registrarError(data: {
  chatter_id: string
  categoria_id: string
  modelo_id?: string | null
  fecha_error?: string
  descripcion?: string
  prueba_url?: string
}) {
  const user = await requireStaff()
  const admin = createAdminClient()

  if (!data.chatter_id) throw new Error('Elige un chatter')
  if (!data.categoria_id) throw new Error('Elige una categoría')

  const { error } = await admin.from('chatter_errores').insert({
    chatter_id: data.chatter_id,
    categoria_id: data.categoria_id,
    modelo_id: data.modelo_id || null,
    fecha_error: data.fecha_error || undefined,
    descripcion: data.descripcion?.trim() || null,
    prueba_url: data.prueba_url?.trim() || null,
    created_by: user.id,
  })
  if (error) throw new Error(error.message)

  await checkSancionAlert(admin, data.chatter_id, data.categoria_id)

  revalidatePath('/modulo-4')
}

export async function actualizarEstadoError(
  id: string,
  estado: 'abierto' | 'coaching' | 'cerrado'
) {
  await requireStaff()
  const admin = createAdminClient()
  const patch: Record<string, unknown> = { estado }
  if (estado === 'coaching') patch.fecha_coaching = new Date().toISOString().split('T')[0]
  const { error } = await admin.from('chatter_errores').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-4')
}

export async function eliminarError(id: string) {
  await requireStaff()
  const admin = createAdminClient()
  const { error } = await admin.from('chatter_errores').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-4')
}

// ============================================================
// Alerta de sanción (una vez por bloque de 3)
// ============================================================
async function checkSancionAlert(
  admin: ReturnType<typeof createAdminClient>,
  chatterId: string,
  categoriaId: string
) {
  const { data: n } = await admin.rpc('contar_errores_categoria_quincena', {
    p_chatter: chatterId,
    p_categoria: categoriaId,
  })
  const total = (n as number) ?? 0
  if (total >= 3 && total % 3 === 0) {
    const { data: ch } = await admin.from('chatters').select('nombre').eq('id', chatterId).single()
    await admin.from('notifications').insert({
      title: 'Nueva sanción de chatter',
      body: `${ch?.nombre ?? 'Un chatter'} alcanzó ${total} errores en una categoría (bloque de 3).`,
      module_id: 4,
      link: '/modulo-4',
    })
  }
}
