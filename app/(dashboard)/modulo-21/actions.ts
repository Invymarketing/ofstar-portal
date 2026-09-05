'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CAMPOS = [
  'nombre_artistico', 'nombre_real', 'nicho', 'ubicacion_ficticia', 'idioma', 'zona_horaria',
  'personalidad', 'tono', 'temas_gusta', 'limites', 'palabras_evitar',
  'precio_custom', 'precio_vc', 'precio_ppv', 'precio_sexting', 'packs', 'pagos_por_fuera',
  'instagram', 'telegram', 'twitter', 'otros_enlaces', 'notas',
] as const

export async function guardarFicha(modeloId: string, data: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager'].includes(me.role)) throw new Error('Solo managers pueden editar las fichas')
  if (!modeloId) throw new Error('Falta la modelo')

  const patch: Record<string, unknown> = { modelo_id: modeloId, updated_by: user.id, updated_at: new Date().toISOString() }
  for (const c of CAMPOS) {
    const v = data[c]
    patch[c] = (typeof v === 'string' && v.trim() === '') ? null : (v ?? null)
  }
  // Edades como número o null
  patch.edad_real = data.edad_real ? Number(data.edad_real) : null
  patch.edad_ficticia = data.edad_ficticia ? Number(data.edad_ficticia) : null

  const { error } = await admin.from('fichas_modelo').upsert(patch, { onConflict: 'modelo_id' })
  if (error) throw new Error(error.message)

  revalidatePath('/modulo-21')
}
