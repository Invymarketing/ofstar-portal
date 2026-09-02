import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import HorariosBoard from '@/components/modulo-17/HorariosBoard'
import { CalendarClock } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Horarios — OF Star Management' }

export default async function Modulo17Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  if (!['admin', 'manager', 'team_leader'].includes(role)) redirect('/')

  const [{ data: chatters }, { data: vas }, { data: horarios, error }] = await Promise.all([
    admin.from('chatters').select('profile_id, nombre').eq('activo', true),
    admin.from('profiles').select('id, full_name').eq('role', 'va'),
    admin.from('horarios').select('profile_id, turno, equipo, dias_descanso'),
  ])

  const tablaLista = !error // false si aún no corrió 021_horarios.sql
  const hMap = new Map((horarios ?? []).map((h) => [h.profile_id, h]))

  // Roster = chatters (con login) + VAs, sin duplicar por profile_id
  const vistos = new Set<string>()
  const roster: {
    profile_id: string; nombre: string; tipo: 'Chatter' | 'VA'
    turno: string | null; equipo: number | null; dias_descanso: number[]
  }[] = []

  for (const c of chatters ?? []) {
    if (!c.profile_id || vistos.has(c.profile_id)) continue
    vistos.add(c.profile_id)
    const h = hMap.get(c.profile_id)
    roster.push({
      profile_id: c.profile_id, nombre: c.nombre, tipo: 'Chatter',
      turno: h?.turno ?? null, equipo: h?.equipo ?? null, dias_descanso: h?.dias_descanso ?? [],
    })
  }
  for (const v of vas ?? []) {
    if (vistos.has(v.id)) continue
    vistos.add(v.id)
    const h = hMap.get(v.id)
    roster.push({
      profile_id: v.id, nombre: v.full_name, tipo: 'VA',
      turno: h?.turno ?? null, equipo: h?.equipo ?? null, dias_descanso: h?.dias_descanso ?? [],
    })
  }
  roster.sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <CalendarClock size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Horarios</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
            Turno, equipo y días de descanso de chatters y VAs · hora Colombia
          </p>
        </div>
      </div>

      {!tablaLista ? (
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}>
          <p className="text-sm font-medium" style={{ color: '#EAB308' }}>Migración pendiente</p>
          <p className="text-xs mt-1" style={{ color: '#6B6B80' }}>
            Ejecuta <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#1E1E2E' }}>021_horarios.sql</code> en Supabase para activar este módulo.
          </p>
        </div>
      ) : (
        <HorariosBoard roster={roster} />
      )}
    </div>
  )
}
