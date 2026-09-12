import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'director_creativo', 'content_manager']

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!EDITOR_ROLES.includes(profile?.role ?? '')) return null
  return { admin }
}

export async function GET(req: Request) {
  const g = await guard()
  if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { admin } = g

  const url = new URL(req.url)
  let q = admin.from('video_jobs').select('*').order('created_at', { ascending: false })
  const st = url.searchParams.get('status'); if (st) q = q.eq('status', st)
  const mid = url.searchParams.get('modelo_id'); if (mid) q = q.eq('modelo_id', mid)
  const pid = url.searchParams.get('editing_profile_id'); if (pid) q = q.eq('editing_profile_id', pid)
  const { data: jobs } = await q

  const assetIds = [...new Set((jobs ?? []).map((j: Record<string, unknown>) => j.video_asset_id as string).filter(Boolean))]
  const modeloIds = [...new Set((jobs ?? []).map((j: Record<string, unknown>) => j.modelo_id as string).filter(Boolean))]
  const profileIds = [...new Set((jobs ?? []).map((j: Record<string, unknown>) => j.editing_profile_id as string).filter(Boolean))]

  const assetMap = new Map<string, string>()
  if (assetIds.length) {
    const { data } = await admin.from('video_assets').select('id, filename').in('id', assetIds)
    for (const a of (data ?? []) as Record<string, unknown>[]) assetMap.set(a.id as string, a.filename as string)
  }
  const modeloMap = new Map<string, string>()
  if (modeloIds.length) {
    const { data } = await admin.from('modelos').select('id, model_name, full_name').in('id', modeloIds)
    for (const m of (data ?? []) as Record<string, unknown>[]) modeloMap.set(m.id as string, (m.model_name as string) || (m.full_name as string) || 'Modelo')
  }
  const profileMap = new Map<string, string>()
  if (profileIds.length) {
    const { data } = await admin.from('editing_profiles').select('id, name').in('id', profileIds)
    for (const p of (data ?? []) as Record<string, unknown>[]) profileMap.set(p.id as string, p.name as string)
  }

  const items = (jobs ?? []).map((j: Record<string, unknown>) => ({
    id: j.id as string,
    status: j.status as string,
    progress: (j.progress as number) ?? 0,
    current_step: (j.current_step as string) ?? '',
    filename: assetMap.get(j.video_asset_id as string) ?? '—',
    modelo: modeloMap.get(j.modelo_id as string) ?? '—',
    profile: profileMap.get(j.editing_profile_id as string) ?? '—',
    created_at: j.created_at as string,
  }))

  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const g = await guard()
  if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { admin } = g

  const b = await req.json()
  const assetId = String(b.video_asset_id ?? '')
  if (!assetId) return NextResponse.json({ error: 'Falta el vídeo.' }, { status: 400 })

  const ahora = new Date().toISOString()
  const { data, error } = await admin.from('video_jobs').insert({
    video_asset_id: assetId,
    modelo_id: b.modelo_id ? String(b.modelo_id) : null,
    editing_profile_id: b.editing_profile_id ? String(b.editing_profile_id) : null,
    custom_instructions: String(b.custom_instructions ?? ''),
    status: 'UPLOADED',
    progress: 0,
    current_step: 'Subido',
    logs: [{ t: ahora, msg: 'Job creado' }],
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, job_id: data?.id })
}
