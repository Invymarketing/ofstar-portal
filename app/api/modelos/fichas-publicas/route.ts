import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager', 'team_leader', 'chatter', 'va'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'sin_permiso' }, { status: 403 })
  }

  const { data: modelos, error } = await admin
    .from('modelos')
    .select('id, full_name, model_name')
    .order('full_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (modelos ?? []).map((m: any) => m.id)
  const fotos: Record<string, string | null> = {}
  if (ids.length > 0) {
    const { data: cuentas } = await admin
      .from('cuentas_analytics')
      .select('modelo_id, profile_pic_url, es_principal')
      .in('modelo_id', ids)
    for (const c of cuentas ?? []) {
      if (!c.modelo_id) continue
      if (c.es_principal || !(c.modelo_id in fotos)) fotos[c.modelo_id] = c.profile_pic_url ?? null
    }
  }

  const lista = (modelos ?? []).map((m: any) => ({
    id: m.id,
    full_name: m.full_name,
    model_name: m.model_name,
    foto_url: fotos[m.id] ?? null,
  }))
  return NextResponse.json({ modelos: lista })
}
