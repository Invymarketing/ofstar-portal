import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Finanzas from '@/components/modulo-22/Finanzas'
import { Wallet } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Finanzas — Skeilab' }

function mesActual(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7)
}

export default async function Modulo20Page({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if ((profile?.role as UserRole) !== 'admin') redirect('/')

  const sp = await searchParams
  const mes = sp?.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesActual()

  const [modelosRes, finRes, gastosRes] = await Promise.all([
    admin.from('modelos').select('id, model_name').order('model_name'),
    admin.from('finanzas_modelo').select('*'),
    admin.from('finanzas_gastos').select('*'),
  ])

  const modelos = (modelosRes.data ?? []).map((m: { id: string; model_name: string }) => ({ id: m.id, model_name: m.model_name }))

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}>
          <Wallet size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Finanzas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Comisiones, gastos y beneficio neto de la agencia · solo tú</p>
        </div>
      </div>
      <Finanzas mes={mes} modelos={modelos} finModelo={finRes.data ?? []} gastos={gastosRes.data ?? []} />
    </div>
  )
}
