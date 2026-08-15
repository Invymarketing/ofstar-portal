// app/api/cuentas/route.ts
// CRUD de cuentas + agrupación por modelo (propias) o grupo (competencia)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(profile?.role ?? '')) return { ok: false as const, status: 403 }
  return { ok: true as const, user, admin }
}

// GET — devuelve cuentas con métricas y reels
export async function GET(request: NextRequest) {
  const auth = await checkAuth()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })

  const tipo = request.nextUrl.searchParams.get('tipo')

  let query = auth.admin
    .from('cuentas_analytics')
    .select(`
      *,
      nichos ( id, nombre, color ),
      modelos ( id, full_name, model_name ),
      metricas_analytics ( fecha, seguidores, siguiendo, engagement_rate ),
      reels_analytics ( url, thumbnail_url, caption, views, likes, comentarios, ratio_vl, fecha_publicacion )
    `)
    .order('created_at', { ascending: false })

  if (tipo) query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cuentas: data ?? [] })
}

// POST — crea cuenta (ahora con modelo_id o grupo_competencia)
export async function POST(request: NextRequest) {
  const auth = await checkAuth()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })

  const body = await request.json()
  const { tipo, ig_username, nicho_id, modelo_id, grupo_competencia, es_principal, notas } = body

  if (!tipo || !ig_username) {
    return NextResponse.json({ error: 'faltan_campos' }, { status: 400 })
  }

  const { data, error } = await auth.admin
    .from('cuentas_analytics')
    .insert({
      tipo,
      ig_username: ig_username.replace('@', '').trim(),
      nicho_id: nicho_id || null,
      modelo_id: modelo_id || null,
      grupo_competencia: grupo_competencia || null,
      es_principal: es_principal ?? false,
      notas: notas || null,
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'cuenta_duplicada' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ cuenta: data })
}

// DELETE
export async function DELETE(request: NextRequest) {
  const auth = await checkAuth()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'falta_id' }, { status: 400 })
  const { error } = await auth.admin.from('cuentas_analytics').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
