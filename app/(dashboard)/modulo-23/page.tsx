import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Horario from '@/components/modulo-23/Horario'
import { Calendar } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Horario semanal — Skeilab' }

function addDays(iso: string, n: number) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10) }
function lunesDe(iso: string) { const [y, m, d] = iso.split('-').map(Number); const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return addDays(iso, -((dow + 6) % 7)) }
function hoyMadrid() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) }

export default async function Modulo23Page({ searchParams }: { searchParams: Promise<{ modelo?: string; lunes?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile?.role ?? '') as UserRole
  const esManager = ['admin', 'manager'].includes(role)
  if (!esManager && role !== 'modelo') redirect('/')

  const sp = await searchParams
  const lunes = sp?.lunes && /^\d{4}-\d{2}-\d{2}$/.test(sp.lunes) ? lunesDe(sp.lunes) : lunesDe(hoyMadrid())
  const domingo = addDays(lunes, 6)

  let modelos: { id: string; full_name: string }[] = []
  let selPid = user.id
  if (esManager) {
    const { data } = await admin.from('profiles').select('id, full_name').eq('role', 'modelo').order('full_name')
    modelos = (data ?? []).map((m: { id: string; full_name: string | null }) => ({ id: m.id, full_name: m.full_name ?? '—' }))
    selPid = sp?.modelo && modelos.some((m) => m.id === sp.modelo) ? sp.modelo : (modelos[0]?.id ?? '')
  }

  let tareas: { id: string; profile_id: string; fecha: string; titulo: string; completada: boolean; completada_at: string | null }[] = []
  if (selPid) {
    const { data } = await admin.from('modelo_tareas').select('id, profile_id, fecha, titulo, completada, completada_at').eq('profile_id', selPid).gte('fecha', lunes).lte('fecha', domingo).order('orden')
    tareas = data ?? []
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}>
          <Calendar size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Horario semanal</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{esManager ? 'Asigna y organiza las tareas de cada modelo' : 'Tus tareas de la semana'}</p>
        </div>
      </div>
      <Horario esManager={esManager} selPid={selPid} modelos={modelos} lunes={lunes} tareas={tareas} />
    </div>
  )
}
