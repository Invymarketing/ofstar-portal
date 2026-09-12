import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_PROFILE_SETTINGS } from '@/lib/ai-editor/types'

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'director_creativo', 'content_manager']

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!EDITOR_ROLES.includes(profile?.role ?? '')) return null
  return { admin, userId: user.id }
}

export async function GET(req: Request) {
  const g = await guard()
  if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { admin } = g

  const url = new URL(req.url)
  const modeloId = url.searchParams.get('modelo_id')
  let q = admin.from('editing_profiles').select('*').order('updated_at', { ascending: false })
  if (modeloId) q = q.eq('modelo_id', modeloId)
  const { data: profiles } = await q

  const modeloIds = [...new Set((profiles ?? []).map((p: Record<string, unknown>) => p.modelo_id as string))]
  const nameMap = new Map<string, string>()
  if (modeloIds.length) {
    const { data: ms } = await admin.from('modelos').select('id, model_name, full_name').in('id', modeloIds)
    for (const m of (ms ?? []) as Record<string, unknown>[]) nameMap.set(m.id as string, (m.model_name as string) || (m.full_name as string) || 'Modelo')
  }

  const items = (profiles ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    modelo_id: p.modelo_id as string,
    modelo: nameMap.get(p.modelo_id as string) ?? 'Modelo',
    name: p.name as string,
    version: p.version as number,
    is_active: !!p.is_active,
    settings: p.settings ?? {},
    custom_instructions: (p.custom_instructions as string) ?? '',
    updated_at: p.updated_at as string,
  }))

  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const g = await guard()
  if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { admin } = g

  const b = await req.json()
  const modeloId = String(b.modelo_id ?? '')
  const name = String(b.name ?? '').trim()
  if (!modeloId || !name) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const payload: Record<string, unknown> = {
    modelo_id: modeloId,
    name,
    settings: (b.settings && typeof b.settings === 'object') ? b.settings : DEFAULT_PROFILE_SETTINGS,
    custom_instructions: String(b.custom_instructions ?? ''),
    is_active: b.is_active === undefined ? true : !!b.is_active,
    updated_at: new Date().toISOString(),
  }

  if (b.id) {
    const { error } = await admin.from('editing_profiles').update(payload).eq('id', String(b.id))
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, id: String(b.id) })
  } else {
    const { data, error } = await admin.from('editing_profiles').insert(payload).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, id: data?.id })
  }
}
