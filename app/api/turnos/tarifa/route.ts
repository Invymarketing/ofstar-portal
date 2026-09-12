import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'manager'].includes(role)) return NextResponse.json({ error: 'no' }, { status: 403 })

  const body = await req.json()
  const userId = String(body.user_id ?? '')
  if (!userId) return NextResponse.json({ error: 'datos' }, { status: 400 })
  const tarifa = (body.tarifa === '' || body.tarifa == null) ? 0 : Number(body.tarifa)

  await admin.from('tarifa_empleado').upsert({ user_id: userId, tarifa_hora: tarifa }, { onConflict: 'user_id' })
  return NextResponse.json({ ok: true })
}
