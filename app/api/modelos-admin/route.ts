// app/api/modelos-admin/route.ts
// Gestión de modelos como fichas internas (sin login obligatorio)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) {
    return { ok: false as const, status: 403 }
  }
  return { ok: true as const, admin, userId: user.id }
}

// GET — lista todas las modelos con su nicho
export async function GET() {
  const auth = await checkAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })

  const { data, error } = await auth.admin
    .from('modelos')
    .select('*, nichos ( id, nombre, color )')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ modelos: data ?? [] })
}

// POST — crea una ficha de modelo (SIN login)
export async function POST(request: NextRequest) {
  const auth = await checkAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })

  const body = await request.json()
  const { full_name, model_name, nicho_id, ig_username, content_snare_url, notion_url, drive_url } = body

  if (!full_name) {
    return NextResponse.json({ error: 'falta_nombre', message: 'El nombre es obligatorio' }, { status: 400 })
  }

  const { data, error } = await auth.admin
    .from('modelos')
    .insert({
      full_name,
      model_name: model_name || full_name,
      nicho_id: nicho_id || null,
      ig_username: ig_username ? ig_username.replace('@', '').trim() : null,
      content_snare_url: content_snare_url || null,
      notion_url: notion_url || null,
      drive_url: drive_url || null,
      created_by: auth.userId,
    })
    .select('*, nichos ( id, nombre, color )')
    .single()

  if (error) return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, modelo: data })
}

// DELETE — elimina una ficha de modelo
export async function DELETE(request: NextRequest) {
  const auth = await checkAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'falta_id' }, { status: 400 })

  const { error } = await auth.admin.from('modelos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
