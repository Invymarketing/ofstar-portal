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
}

export async function actualizarMeta(chatterId: string, meta: number | null) {
  await requireStaff()
  const admin = createAdminClient()
  const { error } = await admin.from('chatters')
    .update({ meta_quincena: meta && meta > 0 ? meta : null }).eq('id', chatterId)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-16')
}
