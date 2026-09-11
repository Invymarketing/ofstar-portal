import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(p?.role ?? '')) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params

  const form = await req.formData()
  const file = form.get('file') as File | null
  const todoId = String(form.get('todoId') || '')
  if (!file || !todoId) return NextResponse.json({ error: 'faltan_datos' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'La imagen supera 8 MB' }, { status: 400 })

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${id}/${todoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from('todo-imagenes').upload(path, buf, { contentType: file.type || 'image/jpeg', upsert: false })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const url = admin.storage.from('todo-imagenes').getPublicUrl(path).data.publicUrl

  const { data: td } = await admin.from('modelo_todos').select('imagenes').eq('id', todoId).eq('modelo_id', id).maybeSingle()
  const actuales: string[] = Array.isArray(td?.imagenes) ? (td!.imagenes as string[]) : []
  const nuevas = [...actuales, url]
  await admin.from('modelo_todos').update({ imagenes: nuevas }).eq('id', todoId).eq('modelo_id', id)

  return NextResponse.json({ imagenes: nuevas })
}
