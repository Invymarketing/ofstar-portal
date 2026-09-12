import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'manager'].includes(role)) return NextResponse.json({ error: 'no' }, { status: 403 })

  const { data: aj } = await admin.from('ajustes_va').select('precio_por_cuenta').eq('id', 1).maybeSingle()
  const precioGlobal = Number(aj?.precio_por_cuenta ?? 0.375)

  const { data: vasRaw } = await admin.from('profiles').select('id, full_name').eq('role', 'va').order('full_name')
  const { data: cfgs } = await admin.from('va_config').select('*')
  const cfgMap = new Map<string, Record<string, unknown>>()
  for (const c of (cfgs ?? []) as Record<string, unknown>[]) cfgMap.set(c.va_id as string, c)

  const vas = (vasRaw ?? []).map((v: Record<string, unknown>) => {
    const c = cfgMap.get(v.id as string)
    return {
      id: v.id as string,
      nombre: (v.full_name as string) ?? 'VA',
      precio_override: c && c.precio_por_cuenta != null ? Number(c.precio_por_cuenta) : null,
      activa: c ? !!c.activa : true,
    }
  })

  return NextResponse.json({ precioGlobal, vas })
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

  if (body.precioGlobal != null && body.precioGlobal !== '') {
    await admin.from('ajustes_va').upsert({ id: 1, precio_por_cuenta: Number(body.precioGlobal) }, { onConflict: 'id' })
  }

  if (body.va_id) {
    const patch: Record<string, unknown> = { va_id: body.va_id }
    if ('precio_override' in body) patch.precio_por_cuenta = (body.precio_override === '' || body.precio_override == null) ? null : Number(body.precio_override)
    if ('activa' in body) patch.activa = !!body.activa
    await admin.from('va_config').upsert(patch, { onConflict: 'va_id' })
  }

  return NextResponse.json({ ok: true })
}
