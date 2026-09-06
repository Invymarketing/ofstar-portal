import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AjustesClient from '@/components/ajustes/AjustesClient'
import { Settings } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/roles'
import type { UserRole } from '@/types'

export const metadata = { title: 'Ajustes — Skeilab' }

export default async function AjustesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role, full_name, idioma').eq('id', user.id).single()
  const role = (profile?.role ?? 'chatter') as UserRole

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}>
          <Settings size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Ajustes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Configura tu cuenta y tus preferencias</p>
        </div>
      </div>
      <AjustesClient nombre={profile?.full_name ?? ''} email={user.email ?? ''} rol={ROLE_LABELS[role]} idiomaActual={profile?.idioma ?? 'es'} esAdmin={role === 'admin'} />
    </div>
  )
}
