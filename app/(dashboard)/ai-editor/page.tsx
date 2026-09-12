import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Clapperboard } from 'lucide-react'
import AiEditor from '@/components/ai-editor/AiEditor'

export const metadata = { title: 'AI Video Editor — Skeilab' }

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'director_creativo', 'content_manager']

export default async function AiEditorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!EDITOR_ROLES.includes(profile?.role ?? '')) redirect('/')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}>
          <Clapperboard size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>AI Video Editor</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Sube un vídeo, elige la modelo y su perfil, y deja que la IA lo edite.</p>
        </div>
      </div>
      <AiEditor />
    </div>
  )
}
