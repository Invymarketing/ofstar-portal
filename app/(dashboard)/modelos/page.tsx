import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ModelosManager from '@/components/modelos/ModelosManager'

export const metadata = { title: 'Modelos — Skeilab' }

export default async function ModelosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user!.id).single()
  const soloLectura = (profile?.role ?? '') === 'chatter'
  return <ModelosManager soloLectura={soloLectura} />
}
