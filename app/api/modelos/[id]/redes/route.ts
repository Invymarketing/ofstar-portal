import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PERMITIDOS = ['admin', 'manager', 'team_leader', 'chatter', 'va', 'creativo', 'marketing_manager', 'content_manager', 'director_creativo']

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  let ver = PERMITIDOS.includes(role)
  if (!ver && role === 'modelo') {
    const { data: m } = await admin.from('modelos').select('id').eq('id', id).eq('user_id', user.id).maybeSingle()
    ver = !!m
  }
  if (!ver) return NextResponse.json({ error: 'no' }, { status: 403 })

  const { data: cuentas } = await admin
    .from('cuentas_analytics')
    .select('ig_username, profile_pic_url, es_principal')
    .eq('modelo_id', id)
    .eq('tipo', 'propia')
    .order('es_principal', { ascending: false })

  let lista = (cuentas ?? []).map((c: any) => ({ ig_username: c.ig_username, foto: c.profile_pic_url ?? null }))
  if (lista.length === 0) {
    const { data: mm } = await admin.from('modelos').select('ig_username').eq('id', id).maybeSingle()
    if (mm?.ig_username) lista = [{ ig_username: mm.ig_username, foto: null }]
  }
  return NextResponse.json({ cuentas: lista })
}
