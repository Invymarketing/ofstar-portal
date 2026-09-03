import { createAdminClient } from '@/lib/supabase/admin'
import ModelosManager from '@/components/modelos/ModelosManager'

export const metadata = { title: 'Modelos — Skeilab' }

export default async function ModelosPage() {
  const admin = createAdminClient()
  const { data: nichos } = await admin
    .from('nichos')
    .select('id, nombre, color')
    .order('orden')

  return <ModelosManager nichos={nichos ?? []} />
}
