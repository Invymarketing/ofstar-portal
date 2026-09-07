import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(p?.role ?? '')) return null
  return { admin }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const [{ data: cuentas }, { data: ficha }] = await Promise.all([
    g.admin.from('profiles').select('id, full_name').eq('role', 'modelo').order('full_name'),
    g.admin.from('modelos').select('user_id').eq('id', id).maybeSingle(),
  ])
  return NextResponse.json({ cuentas: cuentas ?? [], actual: ficha?.user_id ?? null })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const b = await req.json()
  const userId = b.user_id ? String(b.user_id) : null
  if (userId) await g.admin.from('modelos').update({ user_id: null }).eq('user_id', userId).neq('id', id)
  await g.admin.from('modelos').update({ user_id: userId }).eq('id', id)
  return NextResponse.json({ ok: true })
}
