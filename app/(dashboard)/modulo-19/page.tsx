import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RegistroMetricas from '@/components/modulo-19/RegistroMetricas'
import { BarChart3 } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Métricas — Skeilab' }

function lunesSemana(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = parts.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const offset = (dow + 6) % 7
  return new Date(Date.UTC(y, m - 1, d) - offset * 86400000).toISOString().slice(0, 10)
}

export default async function Modulo19Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  if (!['admin', 'manager', 'va'].includes(role)) redirect('/')

  const semana = lunesSemana()

  const { data: cuentas } = await admin
    .from('cuentas_analytics')
    .select('id, ig_username, es_principal, modelos ( model_name )')
    .eq('activa', true)
    .neq('tipo', 'competencia')
    .order('ig_username')

  const lista = (cuentas ?? []).map((c: any) => {
    const mm = Array.isArray(c.modelos) ? c.modelos[0] : c.modelos
    return {
      id: c.id as string,
      ig_username: c.ig_username as string,
      modelo: (mm?.model_name as string) ?? 'Sin modelo',
      es_principal: !!c.es_principal,
    }
  })

  const ids = lista.map((c) => c.id)
  const { data: fichas } = ids.length
    ? await admin.from('audiencia_semanal').select('*').eq('semana_inicio', semana).in('cuenta_id', ids)
    : { data: [] }

  const fechaLarga = new Date(semana + 'T12:00:00Z').toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}>
          <BarChart3 size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Métricas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Registro semanal de audiencia · semana del {fechaLarga}
          </p>
        </div>
      </div>
      <RegistroMetricas cuentas={lista} semana={semana} fichas={fichas ?? []} />
    </div>
  )
}
