import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRecordSource, airtableConfigured } from '@/lib/ai-editor/airtable'

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'content_manager']

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!EDITOR_ROLES.includes(profile?.role ?? '')) return null
  return { admin }
}

function norm(s: unknown): string {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export async function POST(req: Request) {
  const g = await guard()
  if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { admin } = g
  if (!airtableConfigured()) return NextResponse.json({ error: 'Airtable no está configurado.' }, { status: 400 })

  const b = await req.json()
  const recordId = String(b.recordId ?? '')
  const dNum = String(b.dNum ?? '')
  const modeloName = String(b.modelo ?? '')
  if (!recordId || !dNum) return NextResponse.json({ error: 'Faltan datos del vídeo.' }, { status: 400 })

  // URL fresca del bruto
  let src: { url: string | null; filename: string | null; modelo: string }
  try {
    src = await getRecordSource(recordId, dNum)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
  if (!src.url) return NextResponse.json({ error: `No hay vídeo en bruto para ${dNum}.` }, { status: 400 })

  // Casar la modelo de Airtable con una modelo de Skeilab
  const target = norm(modeloName || src.modelo)
  const { data: modelos } = await admin.from('modelos').select('id, model_name, full_name')
  const match = (modelos ?? []).find((m) => {
    const mn = norm(m.model_name)
    const fn = norm(m.full_name)
    return mn === target || fn === target || mn.includes(target) || fn.includes(target) || (target && (target.includes(mn) || target.includes(fn)))
  })
  if (!match) return NextResponse.json({ error: `No encuentro la modelo "${modeloName}" en Skeilab.` }, { status: 400 })

  const { data: profiles } = await admin.from('editing_profiles').select('id').eq('modelo_id', match.id).order('updated_at', { ascending: false }).limit(1)
  const profileId = profiles && profiles.length > 0 ? profiles[0].id : null
  if (!profileId) return NextResponse.json({ error: `La modelo "${modeloName}" no tiene Editing Profile en Skeilab. Créale uno primero.` }, { status: 400 })

  const ahora = new Date().toISOString()
  const { data: job, error } = await admin.from('video_jobs').insert({
    video_asset_id: null,
    modelo_id: match.id,
    editing_profile_id: profileId,
    custom_instructions: '',
    status: 'UPLOADED',
    progress: 0,
    current_step: 'Subido',
    source_url: src.url,
    source_filename: src.filename,
    airtable_record_id: recordId,
    airtable_d: dNum,
    source_duration: typeof b.duration === 'number' ? b.duration : null,
    source_width: typeof b.width === 'number' ? b.width : null,
    source_height: typeof b.height === 'number' ? b.height : null,
    logs: [{ t: ahora, msg: `Creado desde Airtable (${dNum})` }],
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, job_id: job?.id })
}
