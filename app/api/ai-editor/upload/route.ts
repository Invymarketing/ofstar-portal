import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStorage, STORAGE_BUCKET } from '@/lib/ai-editor/storage'

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'director_creativo', 'content_manager']
const MAX_BYTES = 200 * 1024 * 1024 // 200 MB (FASE 1). En FASE 2: subida en streaming.
const ALLOWED = ['video/mp4', 'video/quicktime']

function sanitize(name: string) {
  const base = name.split('/').pop()?.split('\\').pop() ?? 'video'
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}
function num(v: FormDataEntryValue | null): number | null {
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

  const form = await req.formData()
  const file = form.get('file')
  const modeloId = String(form.get('modelo_id') ?? '') || null
  if (!(file instanceof File)) return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 })

  const nombre = sanitize(file.name)
  const okType = ALLOWED.includes(file.type) || /\.(mp4|mov)$/i.test(nombre)
  if (!okType) return NextResponse.json({ error: 'Formato no permitido (solo MP4 o MOV).' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'El archivo supera el máximo de 200 MB (FASE 1).' }, { status: 400 })

  const duration = num(form.get('duration'))
  const width = num(form.get('width'))
  const height = num(form.get('height'))
  const orientation = (width && height) ? (height > width ? 'portrait' : width > height ? 'landscape' : 'square') : null

  const path = `${modeloId ?? 'sin-modelo'}/${crypto.randomUUID()}-${nombre}`
  const buffer = await file.arrayBuffer()
  try {
    await getStorage().upload(path, buffer, file.type || 'video/mp4')
  } catch (e) {
    return NextResponse.json({ error: 'Error al guardar el vídeo: ' + (e as Error).message }, { status: 500 })
  }

  const { data, error } = await admin.from('video_assets').insert({
    modelo_id: modeloId,
    filename: nombre,
    storage_path: path,
    bucket: STORAGE_BUCKET,
    mime: file.type || 'video/mp4',
    size_bytes: file.size,
    duration,
    width,
    height,
    orientation,
    source: 'manual_upload',
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, asset_id: data?.id })
}
