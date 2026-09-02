import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MetadataTool from '@/components/modulo-18/MetadataTool'
import { Sparkles } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Metadata — OF Star Management' }

export default async function Modulo18Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  if (!['admin', 'manager', 'creativo'].includes(role)) redirect('/')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <Sparkles size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Cambiar metadata</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
            Sube una imagen o video y genera varias versiones con metadata única
          </p>
        </div>
      </div>

      <MetadataTool />
    </div>
  )
}
