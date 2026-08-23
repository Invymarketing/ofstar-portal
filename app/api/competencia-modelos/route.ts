// app/api/competencia-modelos/route.ts
// Vínculos entre una cuenta de competencia (cuentas_analytics) y las modelos del roster.
// GET  ?cuenta_id=... → lista de modelo_id vinculados a esa cuenta
// PUT  { cuenta_id, modelo_ids: [...] } → reemplaza los vínculos de esa cuenta por la lista dada
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
  if (!cuentaId) return NextResponse.json({ error: 'falta_cuenta_id' }, { status: 400 })

  const { data, error } = await auth.admin
    .from('competencia_modelos')
    .select('modelo_id')
    .eq('cuenta_id', cuentaId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ modelo_ids: (data ?? []).map((r) => r.modelo_id) })
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
