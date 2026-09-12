import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const { data: aj } = await admin.from('ajustes_va').select('precio_por_cuenta').eq('id', 1).maybeSingle()
  const precioGlobal = Number(aj?.precio_por_cuenta ?? 0.375)
  const { data: cfgs } = await admin.from('va_config').select('va_id, precio_por_cuenta')
  const overrideMap = new Map<string, number | null>()
  for (const c of (cfgs ?? []) as Record<string, unknown>[]) overrideMap.set(c.va_id as string, c.precio_por_cuenta as number | null)

  const { data: regs } = await admin
    .from('registro_va')
    .select('va_id, completada, precio_snapshot, check_actividad, check_historia, check_reel')
    .gte('fecha', desde).lte('fecha', hasta)

  const vaIds = [...new Set((regs ?? []).map((r: Record<string, unknown>) => r.va_id as string))]
  const nameMap = new Map<string, string>()
  if (vaIds.length) {
    const { data: profs } = await admin.from('profiles').select('id, full_name').in('id', vaIds)
    for (const p of (profs ?? []) as Record<string, unknown>[]) nameMap.set(p.id as string, (p.full_name as string) ?? 'VA')
  }

  const acc = new Map<string, { completadas: number; incompletas: number; pago: number }>()
  for (const r of (regs ?? []) as Record<string, unknown>[]) {
    const vaId = r.va_id as string
    const cur = acc.get(vaId) ?? { completadas: 0, incompletas: 0, pago: 0 }
    if (r.completada) {
      cur.completadas += 1
      const precio = r.precio_snapshot != null ? Number(r.precio_snapshot) : (overrideMap.get(vaId) ?? precioGlobal)
      cur.pago += Number(precio)
    } else if (r.check_actividad || r.check_historia || r.check_reel) {
      cur.incompletas += 1
    }
    acc.set(vaId, cur)
  }
  const filas = [...acc.entries()]
    .map(([va_id, v]) => ({ va_id, nombre: nameMap.get(va_id) ?? 'VA', completadas: v.completadas, incompletas: v.incompletas, pago: +v.pago.toFixed(2) }))
    .sort((a, b) => b.pago - a.pago)
  const totalPago = +filas.reduce((s, f) => s + f.pago, 0).toFixed(2)
  const totalCompletadas = filas.reduce((s, f) => s + f.completadas, 0)
  return NextResponse.json({ desde, hasta, filas, totalPago, totalCompletadas })
}
