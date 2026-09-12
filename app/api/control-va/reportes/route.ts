import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TAREAS } from '@/lib/control-va'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'manager'].includes(role)) return NextResponse.json({ error: 'no' }, { status: 403 })

  const url = new URL(req.url)
  const desde = url.searchParams.get('desde') ?? ''
  const hasta = url.searchParams.get('hasta') ?? ''
  if (!desde || !hasta) return NextResponse.json({ error: 'rango' }, { status: 400 })

  const { data: ajRow } = await admin.from('ajustes_va').select('*').eq('id', 1).maybeSingle()
  const ajd = (ajRow ?? {}) as Record<string, unknown>
  const minCfg: Record<string, number> = {}
  for (const t of TAREAS) minCfg[t.key] = ajd[t.min] != null ? Number(ajd[t.min]) : t.defMin
  const tarifaGlobal = ajd.tarifa_hora != null ? Number(ajd.tarifa_hora) : 1.5

  const { data: cfgs } = await admin.from('va_config').select('va_id, tarifa_hora')
  const tarifaMap = new Map<string, number | null>()
  for (const c of (cfgs ?? []) as Record<string, unknown>[]) tarifaMap.set(c.va_id as string, c.tarifa_hora as number | null)

  const { data: regs } = await admin.from('registro_va').select('*').gte('fecha', desde).lte('fecha', hasta)

  const vaIds = [...new Set((regs ?? []).map((r: Record<string, unknown>) => r.va_id as string))]
  const nameMap = new Map<string, string>()
  if (vaIds.length) {
    const { data: profs } = await admin.from('profiles').select('id, full_name').in('id', vaIds)
    for (const p of (profs ?? []) as Record<string, unknown>[]) nameMap.set(p.id as string, (p.full_name as string) ?? 'VA')
  }

  const acc = new Map<string, { completadas: number; minutos: number; pago: number }>()
  for (const r of (regs ?? []) as Record<string, unknown>[]) {
    const vaId = r.va_id as string
    const cur = acc.get(vaId) ?? { completadas: 0, minutos: 0, pago: 0 }
    if (r.completada) cur.completadas += 1
    let minutos = r.minutos_snapshot != null ? Number(r.minutos_snapshot) : 0
    if (r.minutos_snapshot == null) minutos = TAREAS.reduce((s, t) => s + (r[t.col] ? minCfg[t.key] : 0), 0)
    const tarifa = r.tarifa_snapshot != null ? Number(r.tarifa_snapshot) : (tarifaMap.get(vaId) ?? tarifaGlobal)
    cur.minutos += minutos
    cur.pago += (minutos / 60) * tarifa
    acc.set(vaId, cur)
  }

  const filas = [...acc.entries()]
    .map(([va_id, v]) => ({ va_id, nombre: nameMap.get(va_id) ?? 'VA', completadas: v.completadas, minutos: Math.round(v.minutos), pago: +v.pago.toFixed(2) }))
    .sort((a, b) => b.pago - a.pago)
  const totalPago = +filas.reduce((s, f) => s + f.pago, 0).toFixed(2)
  const totalMinutos = filas.reduce((s, f) => s + f.minutos, 0)
  const totalCompletadas = filas.reduce((s, f) => s + f.completadas, 0)
  return NextResponse.json({ desde, hasta, filas, totalPago, totalMinutos, totalCompletadas })
}
