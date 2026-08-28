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

  const modelos = data ?? []

  // Foto de perfil de la cuenta principal de cada modelo (viene de Analytics)
  const ids = modelos.map((m: any) => m.id)
  const fotos: Record<string, string | null> = {}
  if (ids.length > 0) {
    const { data: cuentas } = await auth.admin
      .from('cuentas_analytics')
      .select('modelo_id, profile_pic_url, es_principal')
      .in('modelo_id', ids)

    for (const c of cuentas ?? []) {
      if (!c.modelo_id) continue
      if (c.es_principal || !(c.modelo_id in fotos)) {
        fotos[c.modelo_id] = c.profile_pic_url ?? null
      }
    }
  }

  const conFoto = modelos.map((m: any) => ({ ...m, foto_url: fotos[m.id] ?? null }))

  return NextResponse.json({ modelos: conFoto })
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

// PATCH — edita una ficha existente (nombre real, nombre OF/portal, nicho, IG)
export async function PATCH(request: NextRequest) {
  const auth = await checkAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })

  const body = await request.json()
  const { id, full_name, model_name, nicho_id, ig_username, telegram_group_id } = body
  if (!id) return NextResponse.json({ error: 'falta_id', message: 'Falta el id' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (full_name !== undefined) patch.full_name = String(full_name).trim()
  if (model_name !== undefined) patch.model_name = String(model_name).trim() || null
  if (nicho_id !== undefined) patch.nicho_id = nicho_id || null
  if (ig_username !== undefined) patch.ig_username = ig_username ? String(ig_username).replace('@', '').trim() : null
  if (telegram_group_id !== undefined) patch.telegram_group_id = String(telegram_group_id).trim() || null

  const { data, error } = await auth.admin
    .from('modelos')
    .update(patch)
    .eq('id', id)
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
