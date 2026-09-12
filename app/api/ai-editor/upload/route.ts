import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STORAGE_BUCKET } from '@/lib/ai-editor/storage'

// Este endpoint YA NO recibe el archivo: el vídeo se sube directo del navegador
// a Supabase Storage (URL firmada). Aquí solo se registra el video_asset.

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'director_creativo', 'content_manager']

function sanitize(name: string) {
  const base = name.split('/').pop()?.split('\\').pop() ?? 'video'
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}
function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!EDITOR_ROLES.includes(profile?.role ?? '')) return NextResponse.json({ error: 'no' }, { status: 403 })

  const b = await req.json()
  const path = String(b.path ?? '')
  if (!path) return NextResponse.json({ error: 'Falta la ruta del vídeo.' }, { status: 400 })

  const modeloId = b.modelo_id ? String(b.modelo_id) : null
  const filename = sanitize(String(b.filename ?? 'video'))
  const mime = String(b.mime ?? 'video/mp4')
  const size_bytes = num(b.size_bytes)
  const duration = num(b.duration)
  const width = num(b.width)
  const height = num(b.height)
  const orientation = (width && height) ? (height > width ? 'portrait' : width > height ? 'landscape' : 'square') : null

  const { data, error } = await admin.from('video_assets').insert({
    modelo_id: modeloId,
    filename,
    storage_path: path,
    bucket: STORAGE_BUCKET,
    mime,
    size_bytes,
    duration,
    width,
    height,
    orientation,
    source: 'manual_upload',
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, asset_id: data?.id })
}
