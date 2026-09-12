import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STORAGE_BUCKET } from '@/lib/ai-editor/storage'

const EDITOR_ROLES = ['admin', 'manager', 'creativo', 'director_creativo', 'content_manager']

function sanitize(name: string) {
  const base = name.split('/').pop()?.split('\\').pop() ?? 'video'
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!EDITOR_ROLES.includes(profile?.role ?? '')) return NextResponse.json({ error: 'no' }, { status: 403 })

  const b = await req.json()
  const nombre = sanitize(String(b.filename ?? 'video.mp4'))
  if (!/\.(mp4|mov)$/i.test(nombre)) return NextResponse.json({ error: 'Formato no permitido (solo MP4 o MOV).' }, { status: 400 })
  const modeloId = b.modelo_id ? String(b.modelo_id) : null

  const path = `${modeloId ?? 'sin-modelo'}/${crypto.randomUUID()}-${nombre}`
  const { data, error } = await admin.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'No se pudo generar la URL de subida.' }, { status: 500 })

  return NextResponse.json({ ok: true, path: data.path, token: data.token })
}
