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
  const desdeISO = `${desde}T00:00:00.000Z`
  const hastaISO = `${hasta}T23:59:59.999Z`

  const { data: jornadas } = await admin
    .from('jornadas').select('id, user_id, inicio, fin')
    .gte('inicio', desdeISO).lte('inicio', hastaISO).not('fin', 'is', null)

  const jIds = (jornadas ?? []).map((j: Record<string, unknown>) => j.id as string)
  const { data: descansos } = jIds.length
    ? await admin.from('descansos').select('jornada_id, user_id, inicio, fin').in('jornada_id', jIds).not('fin', 'is', null)
    : { data: [] }

  const trabajadoMs = new Map<string, number>()
  for (const j of (jornadas ?? []) as Record<string, unknown>[]) {
    const ms = +new Date(j.fin as string) - +new Date(j.inicio as string)
    trabajadoMs.set(j.user_id as string, (trabajadoMs.get(j.user_id as string) ?? 0) + ms)
  }
  for (const d of (descansos ?? []) as Record<string, unknown>[]) {
    const ms = +new Date(d.fin as string) - +new Date(d.inicio as string)
    trabajadoMs.set(d.user_id as string, (trabajadoMs.get(d.user_id as string) ?? 0) - ms)
  }

  const { data: profs } = await admin.from('profiles').select('id, full_name, role').neq('role', 'modelo').order('full_name')
  const { data: tarifas } = await admin.from('tarifa_empleado').select('user_id, tarifa_hora')
  const tMap = new Map<string, number>()
  for (const t of (tarifas ?? []) as Record<string, unknown>[]) tMap.set(t.user_id as string, Number(t.tarifa_hora))

  const filas = (profs ?? []).map((p: Record<string, unknown>) => {
    const ms = Math.max(0, trabajadoMs.get(p.id as string) ?? 0)
    const horas = ms / 3600000
    const tarifa = tMap.get(p.id as string) ?? 0
    return { user_id: p.id as string, nombre: (p.full_name as string) ?? '—', role: p.role as string, horas: +horas.toFixed(2), tarifa, pago: +(horas * tarifa).toFixed(2) }
  }).sort((a, b) => b.horas - a.horas)

  const totalPago = +filas.reduce((s, f) => s + f.pago, 0).toFixed(2)
  const totalHoras = +filas.reduce((s, f) => s + f.horas, 0).toFixed(2)
  return NextResponse.json({ desde, hasta, filas, totalPago, totalHoras })
}
