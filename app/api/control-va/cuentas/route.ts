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

  const { data: cuentas } = await admin
    .from('cuentas_analytics')
    .select('id, ig_username, modelos ( model_name )')
    .eq('activa', true)
    .neq('tipo', 'competencia')
    .order('ig_username')

  const { data: excl } = await admin.from('control_va_cuentas').select('cuenta_id, incluida')
  const exclMap = new Map<string, boolean>()
  for (const e of (excl ?? []) as Record<string, unknown>[]) exclMap.set(e.cuenta_id as string, e.incluida as boolean)

  const items = (cuentas ?? []).map((c: Record<string, unknown>) => {
    const mm = Array.isArray(c.modelos) ? c.modelos[0] : c.modelos
    const inc = exclMap.has(c.id as string) ? exclMap.get(c.id as string)! : true
    return { id: c.id as string, ig_username: c.ig_username as string, modelo: ((mm as { model_name?: string } | null)?.model_name) ?? 'Sin modelo', incluida: inc }
  })

  return NextResponse.json({ items })
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
  const cuenta_id = String(body.cuenta_id ?? '')
  const incluida = !!body.incluida
  if (!cuenta_id) return NextResponse.json({ error: 'datos' }, { status: 400 })

  await admin.from('control_va_cuentas').upsert({ cuenta_id, incluida }, { onConflict: 'cuenta_id' })
  return NextResponse.json({ ok: true })
}
