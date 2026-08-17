// app/api/modelos/[id]/metricas/route.ts
// Devuelve el histórico de métricas (serie temporal) de una modelo, agregando sus cuentas
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager', 'creativo'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'sin_permiso' }, { status: 403 })
  }

  const { data: cuentas, error } = await admin
    .from('cuentas_analytics')
    .select('id, ig_username, profile_pic_url, es_principal, metricas_analytics ( fecha, seguidores, siguiendo, engagement_rate )')
    .eq('modelo_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lista: any[] = cuentas ?? []

  const porFecha = new Map<string, { seguidores: number; engs: number[] }>()
  for (const c of lista) {
    for (const m of (c.metricas_analytics ?? [])) {
      const cur = porFecha.get(m.fecha) ?? { seguidores: 0, engs: [] }
      cur.seguidores += m.seguidores ?? 0
      if (m.engagement_rate != null) cur.engs.push(m.engagement_rate)
      porFecha.set(m.fecha, cur)
    }
  }

  const serie = [...porFecha.entries()]
    .map(([fecha, v]) => ({
      fecha,
      seguidores: v.seguidores,
      engagement: v.engs.length ? Number((v.engs.reduce((a, b) => a + b, 0) / v.engs.length).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const cuentasResumen = lista.map((c) => ({
    id: c.id,
    ig_username: c.ig_username,
    profile_pic_url: c.profile_pic_url,
    es_principal: c.es_principal,
  }))

  return NextResponse.json({ serie, cuentas: cuentasResumen })
}
