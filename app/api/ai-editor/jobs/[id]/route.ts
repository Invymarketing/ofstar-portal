import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStorage } from '@/lib/ai-editor/storage'
import { getAIProvider } from '@/lib/ai-editor/ai-provider'
import { JOB_STATUS_FLOW, STATUS_LABEL, type JobStatus } from '@/lib/ai-editor/types'
import type { EditPlanOutput } from '@/lib/ai-editor/edit-plan'

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

function outputFromSettings(s: Record<string, unknown>): EditPlanOutput {
  const res = typeof s.resolution === 'string' ? s.resolution : '1080x1920'
  const [w, h] = res.split('x').map((n) => Number(n))
  return {
    aspectRatio: typeof s.aspectRatio === 'string' ? s.aspectRatio : '9:16',
    width: Number.isFinite(w) && w > 0 ? w : 1080,
    height: Number.isFinite(h) && h > 0 ? h : 1920,
    fps: typeof s.fps === 'number' ? s.fps : 30,
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { admin } = g
  const { id } = await params

  const { data: job } = await admin.from('video_jobs').select('*').eq('id', id).maybeSingle()
  if (!job) return NextResponse.json({ error: 'no existe' }, { status: 404 })

  let asset: { filename: string; signedUrl: string | null } | null = null
  if (job.video_asset_id) {
    const { data: a } = await admin.from('video_assets').select('filename, storage_path').eq('id', job.video_asset_id).maybeSingle()
    if (a) {
      const signedUrl = await getStorage().getSignedUrl(a.storage_path as string, 3600)
      asset = { filename: a.filename as string, signedUrl }
    }
  }

  let modelo = '—'
  if (job.modelo_id) {
    const { data: m } = await admin.from('modelos').select('model_name, full_name').eq('id', job.modelo_id).maybeSingle()
    if (m) modelo = (m.model_name as string) || (m.full_name as string) || 'Modelo'
  }

  let profile: { id: string; name: string; settings: unknown; custom_instructions: string } | null = null
  if (job.editing_profile_id) {
    const { data: pf } = await admin.from('editing_profiles').select('id, name, settings, custom_instructions').eq('id', job.editing_profile_id).maybeSingle()
    if (pf) profile = { id: pf.id as string, name: pf.name as string, settings: pf.settings, custom_instructions: (pf.custom_instructions as string) ?? '' }
  }

  return NextResponse.json({ job, asset, modelo, profile })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { admin } = g
  const { id } = await params

  const b = await req.json()
  const action = String(b.action ?? 'advance')

  const { data: job } = await admin.from('video_jobs').select('*').eq('id', id).maybeSingle()
  if (!job) return NextResponse.json({ error: 'no existe' }, { status: 404 })

  const logs = Array.isArray(job.logs) ? [...job.logs] : []
  const ahora = new Date().toISOString()
  const flow = JOB_STATUS_FLOW
  const reviewIdx = flow.indexOf('REVIEW')
  const patch: Record<string, unknown> = {}

  if (action === 'approve') {
    patch.status = 'COMPLETED'
    patch.progress = 100
    patch.completed_at = ahora
    logs.push({ t: ahora, msg: 'Aprobado' })
  } else if (action === 'reject') {
    patch.status = 'CANCELLED'
    logs.push({ t: ahora, msg: 'Rechazado' })
  } else if (action === 'regenerate') {
    patch.status = 'QUEUED'
    patch.progress = 5
    patch.current_step = STATUS_LABEL.QUEUED
    patch.edit_plan = null
    logs.push({ t: ahora, msg: 'Regenerar: vuelta a la cola' })
  } else if (action === 'generate') {
    patch.status = 'QUEUED'
    patch.progress = 5
    patch.current_step = STATUS_LABEL.QUEUED
    patch.started_at = job.started_at ?? ahora
    logs.push({ t: ahora, msg: 'Generación iniciada' })
  } else {
    // advance: un paso en el flujo, sin pasar de REVIEW
    const curIdx = flow.indexOf(job.status as JobStatus)
    if (curIdx < 0 || curIdx >= reviewIdx) {
      return NextResponse.json({ ok: true, status: job.status })
    }
    const nextIdx = Math.min(curIdx + 1, reviewIdx)
    const newStatus = flow[nextIdx]
    patch.status = newStatus
    patch.progress = Math.round((nextIdx / (flow.length - 1)) * 100)
    patch.current_step = STATUS_LABEL[newStatus]
    logs.push({ t: ahora, msg: STATUS_LABEL[newStatus] })

    // Al llegar a PLANNING generamos un EditPlan (stub en FASE 1)
    if (newStatus === 'PLANNING' && job.editing_profile_id) {
      const { data: pf } = await admin.from('editing_profiles').select('settings').eq('id', job.editing_profile_id).maybeSingle()
      const settings = (pf?.settings && typeof pf.settings === 'object') ? pf.settings as Record<string, unknown> : {}
      const plan = await getAIProvider().generateEditPlan({
        sourceVideoId: String(job.video_asset_id ?? ''),
        output: outputFromSettings(settings),
        settings,
        customInstructions: (job.custom_instructions as string) ?? '',
      })
      patch.edit_plan = plan
      patch.ai_provider = getAIProvider().name
    }
  }

  patch.logs = logs
  const { error } = await admin.from('video_jobs').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, status: patch.status ?? job.status })
}
