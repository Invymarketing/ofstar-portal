import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStorage } from '@/lib/ai-editor/storage'
import { getAIProvider } from '@/lib/ai-editor/ai-provider'
import { JOB_STATUS_FLOW, STATUS_LABEL, type JobStatus } from '@/lib/ai-editor/types'
import type { EditPlan, EditPlanOutput } from '@/lib/ai-editor/edit-plan'
import { startLambdaRender, pollLambdaRender, lambdaConfigured } from '@/lib/ai-editor/lambda-render'

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

type AdminClient = ReturnType<typeof createAdminClient>

async function resolveSourceUrl(admin: AdminClient, sourceUrl: string | null, videoAssetId: string | null): Promise<string | null> {
  if (sourceUrl) return sourceUrl
  if (!videoAssetId) return null
  const { data: a } = await admin.from('video_assets').select('storage_path').eq('id', videoAssetId).maybeSingle()
  if (!a?.storage_path) return null
  return await getStorage().getSignedUrl(a.storage_path as string, 3600)
}

async function resolveDuration(admin: AdminClient, sourceDuration: number | null, videoAssetId: string | null): Promise<number | null> {
  if (sourceDuration && sourceDuration > 0) return sourceDuration
  if (!videoAssetId) return null
  const { data: a } = await admin.from('video_assets').select('duration').eq('id', videoAssetId).maybeSingle()
  const d = a?.duration
  return typeof d === 'number' && d > 0 ? d : null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { admin } = g
  const { id } = await params

  const { data: job } = await admin.from('video_jobs').select('*').eq('id', id).maybeSingle()
  if (!job) return NextResponse.json({ error: 'no existe' }, { status: 404 })

  let asset: { filename: string; signedUrl: string | null } | null = null
  if (job.source_url) {
    asset = { filename: (job.source_filename as string) || 'Vídeo', signedUrl: job.source_url as string }
  } else if (job.video_asset_id) {
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
    patch.error_message = null
    patch.render_id = null
    patch.render_bucket = null
    patch.output_url = null
    logs.push({ t: ahora, msg: 'Regenerar: vuelta a la cola' })
  } else if (action === 'generate') {
    patch.status = 'QUEUED'
    patch.progress = 5
    patch.current_step = STATUS_LABEL.QUEUED
    patch.started_at = job.started_at ?? ahora
    patch.error_message = null
    patch.render_id = null
    patch.render_bucket = null
    patch.output_url = null
    logs.push({ t: ahora, msg: 'Generación iniciada' })
  } else if (action === 'pollRender') {
    if (job.status !== 'RENDERING' || !job.render_id || !job.render_bucket) {
      return NextResponse.json({ ok: true, status: job.status })
    }
    try {
      const r = await pollLambdaRender(job.render_id as string, job.render_bucket as string)
      if (r.error) {
        patch.status = 'FAILED'
        patch.current_step = 'Error'
        patch.error_message = r.error
        logs.push({ t: new Date().toISOString(), msg: 'Error render: ' + r.error })
      } else if (r.done) {
        patch.status = 'REVIEW'
        patch.progress = 95
        patch.current_step = STATUS_LABEL.REVIEW
        patch.output_url = r.outputUrl
        logs.push({ t: new Date().toISOString(), msg: 'Render completado' })
      } else {
        patch.progress = Math.max(60, Math.min(94, Math.round(60 + r.progress * 34)))
      }
    } catch (e) {
      patch.status = 'FAILED'
      patch.current_step = 'Error'
      patch.error_message = (e as Error).message
      logs.push({ t: new Date().toISOString(), msg: 'Error render: ' + (e as Error).message })
    }
  } else {
    const curIdx = flow.indexOf(job.status as JobStatus)
    if (curIdx < 0 || curIdx >= reviewIdx) {
      return NextResponse.json({ ok: true, status: job.status })
    }
    const nextIdx = Math.min(curIdx + 1, reviewIdx)
    const newStatus = flow[nextIdx]

    if (newStatus === 'RENDERING') {
      const plan = (job.edit_plan && typeof job.edit_plan === 'object') ? (job.edit_plan as EditPlan) : null
      if (!plan) {
        patch.status = 'FAILED'
        patch.current_step = 'Error'
        patch.error_message = 'No hay plan de edición para renderizar.'
        logs.push({ t: ahora, msg: patch.error_message as string })
      } else if (!lambdaConfigured()) {
        patch.status = 'FAILED'
        patch.current_step = 'Error'
        patch.error_message = 'Falta configurar Remotion Lambda (variables REMOTION_* en el servidor).'
        logs.push({ t: ahora, msg: patch.error_message as string })
      } else {
        try {
          const src = await resolveSourceUrl(admin, (job.source_url as string) ?? null, (job.video_asset_id as string) ?? null)
          if (!src) throw new Error('No se pudo obtener la URL del vídeo original.')
          if (!Array.isArray(plan.segments) || plan.segments.length === 0) {
            const dur = await resolveDuration(admin, (job.source_duration as number) ?? null, (job.video_asset_id as string) ?? null)
            plan.segments = [{ sourceStart: 0, sourceEnd: dur ?? 10, outputStart: 0 }]
          }
          const { renderId, bucketName } = await startLambdaRender(src, plan)
          patch.status = 'RENDERING'
          patch.current_step = STATUS_LABEL.RENDERING
          patch.progress = 60
          patch.render_id = renderId
          patch.render_bucket = bucketName
          patch.output_url = null
          patch.error_message = null
          logs.push({ t: ahora, msg: 'Render iniciado en Lambda' })
        } catch (e) {
          patch.status = 'FAILED'
          patch.current_step = 'Error'
          patch.error_message = (e as Error).message
          logs.push({ t: ahora, msg: 'Error al iniciar render: ' + (e as Error).message })
        }
      }
    } else {
      patch.status = newStatus
      patch.progress = Math.round((nextIdx / (flow.length - 1)) * 100)
      patch.current_step = STATUS_LABEL[newStatus]
      logs.push({ t: ahora, msg: STATUS_LABEL[newStatus] })

      if (newStatus === 'PLANNING' && job.editing_profile_id) {
        try {
          const { data: pf } = await admin.from('editing_profiles').select('settings').eq('id', job.editing_profile_id).maybeSingle()
          const settings = (pf?.settings && typeof pf.settings === 'object') ? pf.settings as Record<string, unknown> : {}

          let videoInfo: { duration?: number; width?: number; height?: number } | undefined
          if (job.source_url) {
            videoInfo = {
              duration: typeof job.source_duration === 'number' ? job.source_duration : undefined,
              width: typeof job.source_width === 'number' ? job.source_width : undefined,
              height: typeof job.source_height === 'number' ? job.source_height : undefined,
            }
          } else if (job.video_asset_id) {
            const { data: va } = await admin.from('video_assets').select('duration, width, height').eq('id', job.video_asset_id).maybeSingle()
            if (va) videoInfo = { duration: (va.duration as number) ?? undefined, width: (va.width as number) ?? undefined, height: (va.height as number) ?? undefined }
          }

          const provider = getAIProvider()
          const plan = await provider.generateEditPlan({
            sourceVideoId: String(job.video_asset_id ?? job.id ?? ''),
            output: outputFromSettings(settings),
            settings,
            customInstructions: (job.custom_instructions as string) ?? '',
            videoInfo,
          })
          patch.edit_plan = plan
          patch.ai_provider = provider.name
          patch.ai_model = process.env.OPENAI_PLANNING_MODEL ?? (provider.name === 'openai' ? 'gpt-5.6-luna' : provider.name)
          if (provider.lastUsage) {
            patch.input_tokens = provider.lastUsage.inputTokens
            patch.output_tokens = provider.lastUsage.outputTokens
            patch.estimated_ai_cost = +((provider.lastUsage.inputTokens / 1e6) * 0.20 + (provider.lastUsage.outputTokens / 1e6) * 1.20).toFixed(6)
          }
          logs.push({ t: new Date().toISOString(), msg: 'EditPlan generado (' + provider.name + ')' })
        } catch (e) {
          patch.status = 'FAILED'
          patch.current_step = 'Error'
          patch.error_message = (e as Error).message
          logs.push({ t: new Date().toISOString(), msg: 'Error IA: ' + (e as Error).message })
        }
      }
    }
  }

  patch.logs = logs
  const { error } = await admin.from('video_jobs').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, status: patch.status ?? job.status })
}
