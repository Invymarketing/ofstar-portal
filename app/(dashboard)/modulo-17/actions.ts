'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TURNOS = ['mañana', 'tarde', 'noche'] as const
type Turno = (typeof TURNOS)[number]

async function requireStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'team_leader'].includes(me.role)) {
    throw new Error('Sin permiso para gestionar horarios')
  }
  return admin
}

export async function guardarHorario(input: {
  profileId: string
  turno: Turno | null
  equipo: number | null
  dias_descanso: number[]
}) {
  const admin = await requireStaff()

  const turno = input.turno && TURNOS.includes(input.turno) ? input.turno : null
  const equipo = input.equipo && input.equipo >= 1 && input.equipo <= 4 ? input.equipo : null
  const dias = [...new Set((input.dias_descanso ?? []).filter((d) => d >= 0 && d <= 6))].sort()

  const { error } = await admin.from('horarios').upsert({
    profile_id: input.profileId,
    turno,
    equipo,
    dias_descanso: dias,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id' })
  if (error) throw new Error(error.message)

  // Si la persona es chatter, refleja el equipo en su ficha para el resto del CRM
  // (novedades por equipo, metas, etc.).
  if (equipo != null) {
    await admin.from('chatters').update({ equipo }).eq('profile_id', input.profileId)
  }

  revalidatePath('/modulo-17')
  revalidatePath('/modulo-15')
}
