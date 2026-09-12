import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import JobEditor from '@/components/ai-editor/JobEditor'

export const metadata = { title: 'Editor — Skeilab' }

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'director_creativo', 'content_manager']

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!EDITOR_ROLES.includes(profile?.role ?? '')) redirect('/')

  const { jobId } = await params
  return (
    <div className="max-w-5xl mx-auto">
      <JobEditor jobId={jobId} />
    </div>
  )
}
