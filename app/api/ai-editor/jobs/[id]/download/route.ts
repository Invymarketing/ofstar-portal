import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { presignOutput } from '@/lib/ai-editor/lambda-render'

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'content_manager']

async function guard(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return EDITOR_ROLES.includes(profile?.role ?? '')
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard())) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const admin = createAdminClient()
  const { data: job } = await admin.from('video_jobs').select('render_id, render_bucket, output_url').eq('id', id).maybeSingle()
  if (!job) return NextResponse.json({ error: 'no existe' }, { status: 404 })

  let url: string | null = null
  if (job.render_id && job.render_bucket) {
    try { url = await presignOutput(job.render_id as string, job.render_bucket as string) } catch { url = null }
  }
  if (!url) url = (job.output_url as string) ?? null
  if (!url) return NextResponse.json({ error: 'Sin vídeo editado.' }, { status: 404 })

  const upstream = await fetch(url)
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: 'No se pudo obtener el vídeo.' }, { status: 502 })

  const name = `skeilab-editado-${String(id).slice(0, 8)}.mp4`
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
}
