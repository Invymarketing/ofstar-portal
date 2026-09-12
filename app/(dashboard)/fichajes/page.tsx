import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Clock } from 'lucide-react'
import ReporteHoras from '@/components/modulo-15/ReporteHoras'

export const metadata = { title: 'Fichajes y horas — Skeilab' }

export default async function FichajesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'manager'].includes(role)) redirect('/')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}>
          <Clock size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Fichajes y horas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Horas trabajadas y pago por hora del equipo. No incluye chatters (se pagan aparte) ni modelos.</p>
        </div>
      </div>
      <ReporteHoras />
    </div>
  )
}
