import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AnalyticsDashboard from '@/components/modulo-2/AnalyticsDashboard'

export const metadata = { title: 'Analytics & Referencias — OF Star Management' }

export default async function Modulo2Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  // Cargar nichos desde la BD
  const { data: nichos } = await admin
    .from('nichos')
    .select('id, nombre, color')
    .order('orden')

  return (
    <AnalyticsDashboard
      userId={user!.id}
      userRole={profile?.role ?? 'admin'}
      nichos={nichos ?? []}
    />
  )
}
