// app/api/competencia-modelos/route.ts
// Vínculos entre una cuenta de competencia (cuentas_analytics) y las modelos del roster.
// GET  ?cuenta_id=... → lista de modelo_id vinculados a esa cuenta
// GET  ?modelo_id=...  → lista de cuentas de competencia vinculadas a esa modelo
// PUT  { cuenta_id, modelo_ids: [...] }               → reemplaza los vínculos de esa cuenta
// POST { modelo_id, cuenta_ids, op:'link'|'unlink' }  → vincula/desvincula un conjunto para UNA modelo
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager', 'creativo'].includes(profile?.role ?? '')) {
    return { ok: false as const, status: 403 }
  }
  return { ok: true as const, admin, user }
}

export async function GET(req: Request) {
  const auth = await checkAuth()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })

  const url = new URL(req.url)
  const cuentaId = url.searchParams.get('cuenta_id')
  const modeloId = url.searchParams.get('modelo_id')

  // Vínculos de una cuenta → modelos
  if (cuentaId) {
    const { data, error } = await auth.admin
      .from('competencia_modelos')
      .select('modelo_id')
      .eq('cuenta_id', cuentaId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ modelo_ids: (data ?? []).map((r) => r.modelo_id) })
  }

  // Cuentas de competencia vinculadas a una modelo
  if (modeloId) {
    const { data: links, error: e1 } = await auth.admin
      .from('competencia_modelos')
      .select('cuenta_id')
      .eq('modelo_id', modeloId)
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
    const ids = (links ?? []).map((r) => r.cuenta_id)
    if (ids.length === 0) return NextResponse.json({ cuentas: [] })
    const { data: cuentas, error: e2 } = await auth.admin
      .from('cuentas_analytics')
      .select('id, ig_username, grupo_competencia, profile_pic_url, full_name, es_principal')
      .in('id', ids)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    return NextResponse.json({ cuentas: cuentas ?? [] })
  }

  return NextResponse.json({ error: 'falta_parametro' }, { status: 400 })
}

export async function PUT(req: Request) {
  const auth = await checkAuth()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })

  const body = await req.json()
  const cuentaId: string = body.cuenta_id
  const modeloIds: string[] = Array.isArray(body.modelo_ids) ? body.modelo_ids : []
  if (!cuentaId) return NextResponse.json({ error: 'falta_cuenta_id' }, { status: 400 })

  // Estrategia simple y segura: borrar los vínculos actuales de esa cuenta y reinsertar la lista.
  const del = await auth.admin.from('competencia_modelos').delete().eq('cuenta_id', cuentaId)
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 })

  if (modeloIds.length > 0) {
    const filas = modeloIds.map((m) => ({ cuenta_id: cuentaId, modelo_id: m }))
    const ins = await auth.admin.from('competencia_modelos').insert(filas)
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cuenta_id: cuentaId, modelo_ids: modeloIds })
}

// Vincular/desvincular varias cuentas a UNA modelo concreta (gestión desde la ficha de competencia)
export async function POST(req: Request) {
  const auth = await checkAuth()
  if (!auth.ok) return NextResponse.json({ error: 'sin_permiso' }, { status: auth.status })

  const body = await req.json()
  const modeloId: string = body.modelo_id
  const cuentaIds: string[] = Array.isArray(body.cuenta_ids) ? body.cuenta_ids.filter(Boolean) : []
  const op: string = body.op === 'unlink' ? 'unlink' : 'link'
  if (!modeloId || cuentaIds.length === 0) return NextResponse.json({ error: 'faltan_datos' }, { status: 400 })

  if (op === 'unlink') {
    const { error } = await auth.admin
      .from('competencia_modelos')
      .delete()
      .eq('modelo_id', modeloId)
      .in('cuenta_id', cuentaIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, op, modelo_id: modeloId, cuenta_ids: cuentaIds })
  }

  // link: quitamos los que ya existan para no duplicar, y reinsertamos
  const { data: ya } = await auth.admin
    .from('competencia_modelos')
    .select('cuenta_id')
    .eq('modelo_id', modeloId)
    .in('cuenta_id', cuentaIds)
  const yaSet = new Set((ya ?? []).map((r) => r.cuenta_id))
  const nuevas = cuentaIds.filter((id) => !yaSet.has(id))
  if (nuevas.length > 0) {
    const filas = nuevas.map((id) => ({ cuenta_id: id, modelo_id: modeloId }))
    const ins = await auth.admin.from('competencia_modelos').insert(filas)
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, op, modelo_id: modeloId, cuenta_ids: cuentaIds })
}
