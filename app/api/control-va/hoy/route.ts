import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TAREAS, TAREA_KEYS } from '@/lib/control-va'

type Admin = ReturnType<typeof createAdminClient>

function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

async function cargarAjustes(admin: Admin): Promise<{ tarifa: number; min: Record<string, number> }> {
  const { data } = await admin.from('ajustes_va').select('*').eq('id', 1).maybeSingle()
  const d = (data ?? {}) as Record<string, unknown>
  const min: Record<string, number> = {}
  for (const t of TAREAS) min[t.key] = d[t.min] != null ? Number(d[t.min]) : t.defMin
  return { tarifa: d.tarifa_hora != null ? Number(d.tarifa_hora) : 1.5, min }
}

async function tarifaDeVa(admin: Admin, vaId: string, global: number): Promise<number> {
  const { data } = await admin.from('va_config').select('tarifa_hora').eq('va_id', vaId).maybeSingle()
  if (data && data.tarifa_hora != null) return Number(data.tarifa_hora)
  return global
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['va', 'admin', 'manager'].includes(role)) return NextResponse.json({ error: 'no' }, { status: 403 })

  const fecha = hoyMadrid()
  const aj = await cargarAjustes(admin)
  const tarifa = await tarifaDeVa(admin, user.id, aj.tarifa)

  const { data: cuentas } = await admin
    .from('cuentas_analytics')
    .select('id, ig_username, modelos ( model_name )')
    .eq('activa', true)
    .neq('tipo', 'competencia')
    .order('ig_username')

  const { data: excl } = await admin.from('control_va_cuentas').select('cuenta_id, incluida')
  const excluidas = new Set((excl ?? []).filter((e: Record<string, unknown>) => e.incluida === false).map((e: Record<string, unknown>) => e.cuenta_id as string))

  const lista = (cuentas ?? [])
    .map((c: Record<string, unknown>) => {
      const mm = Array.isArray(c.modelos) ? c.modelos[0] : c.modelos
      return { id: c.id as string, ig_username: c.ig_username as string, modelo: ((mm as { model_name?: string } | null)?.model_name) ?? 'Sin modelo' }
    })
    .filter((c) => !excluidas.has(c.id))

  const ids = lista.map((c) => c.id)
  const { data: regs } = ids.length
    ? await admin.from('registro_va').select('*').eq('fecha', fecha).eq('va_id', user.id).in('cuenta_id', ids)
    : { data: [] }
  const byCuenta = new Map<string, Record<string, unknown>>()
  for (const r of (regs ?? []) as Record<string, unknown>[]) byCuenta.set(r.cuenta_id as string, r)

  const cuentasOut = lista.map((c) => {
    const r = byCuenta.get(c.id)
    const o: Record<string, unknown> = { id: c.id, ig_username: c.ig_username, modelo: c.modelo }
    let all = true
    for (const t of TAREAS) { const v = !!r?.[t.col]; o[t.key] = v; if (!v) all = false }
    o.completada = all
    return o
  })

  return NextResponse.json({ fecha, tarifaHora: tarifa, minutos: aj.min, cuentas: cuentasOut })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['va', 'admin', 'manager'].includes(role)) return NextResponse.json({ error: 'no' }, { status: 403 })

  const body = await req.json()
  const cuenta_id = String(body.cuenta_id ?? '')
  const tarea = String(body.tarea ?? '')
  const valor = !!body.valor
  const tdef = TAREAS.find((t) => t.key === tarea)
  if (!cuenta_id || !tdef || !TAREA_KEYS.includes(tarea)) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const fecha = hoyMadrid()
  const aj = await cargarAjustes(admin)
  const tarifa = await tarifaDeVa(admin, user.id, aj.tarifa)
  const ahora = new Date().toISOString()

  const { data: ex } = await admin.from('registro_va').select('*').eq('fecha', fecha).eq('va_id', user.id).eq('cuenta_id', cuenta_id).maybeSingle()
  const fila: Record<string, unknown> = (ex as Record<string, unknown>) ?? {}
  fila[tdef.col] = valor
  fila[tdef.ts] = valor ? ahora : null

  const completada = TAREAS.every((t) => !!fila[t.col])
  const minutos = TAREAS.reduce((s, t) => s + (fila[t.col] ? aj.min[t.key] : 0), 0)

  const payload: Record<string, unknown> = {
    fecha, va_id: user.id, cuenta_id,
    completada, minutos_snapshot: minutos, tarifa_snapshot: tarifa,
  }
  for (const t of TAREAS) {
    payload[t.col] = !!fila[t.col]
    payload[t.ts] = (fila[t.ts] as string | null) ?? null
  }
  await admin.from('registro_va').upsert(payload, { onConflict: 'fecha,va_id,cuenta_id' })

  return NextResponse.json({ ok: true })
}
