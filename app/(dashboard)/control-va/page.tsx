import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CheckSquare } from 'lucide-react'
import VaHoy from '@/components/control-va/VaHoy'
import ControlVaAdmin from '@/components/control-va/ControlVaAdmin'

export const metadata = { title: 'Control VA — Skeilab' }

export default async function ControlVaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'manager', 'va'].includes(role)) redirect('/')
  const esAdmin = role === 'admin' || role === 'manager'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}>
          <CheckSquare size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Control VA</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {esAdmin ? 'Reportes de pago por cuenta gestionada y ajustes.' : 'Marca las cuentas que gestionas hoy y mira lo que llevas ganado.'}
          </p>
        </div>
      </div>
      {esAdmin ? <ControlVaAdmin /> : <VaHoy />}
    </div>
  )
}
