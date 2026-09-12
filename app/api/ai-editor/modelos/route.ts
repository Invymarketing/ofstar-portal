import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'director_creativo', 'content_manager']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!EDITOR_ROLES.includes(profile?.role ?? '')) return NextResponse.json({ error: 'no' }, { status: 403 })

  const { data } = await admin.from('modelos').select('id, model_name, full_name').eq('activa', true).order('model_name')
  const modelos = (data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    nombre: (m.model_name as string) || (m.full_name as string) || 'Modelo',
  }))
  return NextResponse.json({ modelos })
}
