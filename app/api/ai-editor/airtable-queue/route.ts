import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getQueue, airtableConfigured } from '@/lib/ai-editor/airtable'

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'content_manager']

async function guard(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return EDITOR_ROLES.includes(profile?.role ?? '')
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'no' }, { status: 403 })
  if (!airtableConfigured()) return NextResponse.json({ configured: false, tasks: [] })
  try {
    const tasks = await getQueue()
    return NextResponse.json({ configured: true, tasks })
  } catch (e) {
    return NextResponse.json({ configured: true, tasks: [], error: (e as Error).message })
  }
}
