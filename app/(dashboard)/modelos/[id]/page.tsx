import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ModeloEditForm from '@/components/modelos/ModeloEditForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Editar Modelo — OF Star Management' }

export default async function ModeloDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: currentProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = currentProfile?.role as UserRole
  if (!['admin', 'manager'].includes(role)) redirect('/')

  const { data: modelo } = await admin
    .from('profiles')
    .select('id, full_name, model_name, content_snare_url, notion_url')
    .eq('id', id)
    .eq('role', 'modelo')
    .single()

  if (!modelo) notFound()

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/modelos"
        className="inline-flex items-center gap-1.5 text-xs mb-8 transition-colors hover:opacity-80"
        style={{ color: '#6B6B80' }}
      >
        <ArrowLeft size={13} />
        Volver a Modelos
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-4 mb-1">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ backgroundColor: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            {modelo.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>
              {modelo.full_name}
            </h1>
            <p className="text-sm" style={{ color: '#6B6B80' }}>Modelo</p>
          </div>
        </div>
      </div>

      <ModeloEditForm modelo={modelo} />
    </div>
  )
}
