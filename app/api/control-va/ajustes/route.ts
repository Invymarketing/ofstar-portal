import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TAREAS } from '@/lib/control-va'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'manager'].includes(role)) return NextResponse.json({ error: 'no' }, { status: 403 })

  const { data: ajRow } = await admin.from('ajustes_va').select('*').eq('id', 1).maybeSingle()
  const ajd = (ajRow ?? {}) as Record<string, unknown>
  const tarifaHora = ajd.tarifa_hora != null ? Number(ajd.tarifa_hora) : 1.5
  const minutos: Record<string, number> = {}
  for (const t of TAREAS) minutos[t.key] = ajd[t.min] != null ? Number(ajd[t.min]) : t.defMin

  const { data: vasRaw } = await admin.from('profiles').select('id, full_name').eq('role', 'va').order('full_name')
  const { data: cfgs } = await admin.from('va_config').select('*')
  const cfgMap = new Map<string, Record<string, unknown>>()
  for (const c of (cfgs ?? []) as Record<string, unknown>[]) cfgMap.set(c.va_id as string, c)

  const vas = (vasRaw ?? []).map((v: Record<string, unknown>) => {
    const c = cfgMap.get(v.id as string)
    return {
      id: v.id as string,
      nombre: (v.full_name as string) ?? 'VA',
      tarifa_override: c && c.tarifa_hora != null ? Number(c.tarifa_hora) : null,
      activa: c ? !!c.activa : true,
    }
  })

  return NextResponse.json({ tarifaHora, minutos, vas })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'manager'].includes(role)) return NextResponse.json({ error: 'no' }, { status: 403 })

  const body = await req.json()

  if (body.tarifaHora != null || body.minutos != null) {
    const patch: Record<string, unknown> = { id: 1 }
    if (body.tarifaHora != null && body.tarifaHora !== '') patch.tarifa_hora = Number(body.tarifaHora)
    if (body.minutos && typeof body.minutos === 'object') {
      for (const t of TAREAS) {
        const v = (body.minutos as Record<string, unknown>)[t.key]
        if (v != null && v !== '') patch[t.min] = Math.round(Number(v))
      }
    }
    await admin.from('ajustes_va').upsert(patch, { onConflict: 'id' })
  }

  if (body.va_id) {
    const patch: Record<string, unknown> = { va_id: body.va_id }
    if ('tarifa_override' in body) patch.tarifa_hora = (body.tarifa_override === '' || body.tarifa_override == null) ? null : Number(body.tarifa_override)
    if ('activa' in body) patch.activa = !!body.activa
    await admin.from('va_config').upsert(patch, { onConflict: 'va_id' })
  }

  return NextResponse.json({ ok: true })
}
