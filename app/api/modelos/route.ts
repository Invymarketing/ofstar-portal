// app/api/modelos/route.ts
// Devuelve las modelos (fichas) para el desplegable de Analytics

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'manager'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'sin_permiso' }, { status: 403 })
  }

  const { data: modelos, error } = await admin
    .from('modelos')
    .select('id, full_name, model_name')
    .eq('activa', true)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lista = (modelos ?? []).map(m => ({
    id: m.id,
    nombre: m.model_name || m.full_name,
  }))

  return NextResponse.json({ modelos: lista })
}
