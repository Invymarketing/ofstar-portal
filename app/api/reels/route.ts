// app/api/reels/route.ts
// Devuelve reels con info de cuenta, modelo Y nicho (para agrupar por nicho)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager', 'creativo'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'sin_permiso' }, { status: 403 })
  }

  const tipo = request.nextUrl.searchParams.get('tipo') || 'competencia'

  const { data, error } = await admin
    .from('reels_analytics')
    .select(`
      url, thumbnail_url, caption, views, likes, comentarios, ratio_vl, fecha_publicacion,
      cuentas_analytics!inner (
        id, ig_username, tipo, grupo_competencia,
        nichos ( id, nombre, color ),
        modelos ( id, full_name, model_name )
      )
    `)
    .eq('cuentas_analytics.tipo', tipo)
    .order('views', { ascending: false })
    .limit(3000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Vínculos cuenta→modelos (tabla puente). Solo relevante para competencia.
  // Construimos un mapa cuenta_id -> [{id, nombre}] con las modelos vinculadas.
  const cuentaIds = Array.from(
    new Set((data ?? []).map((r: any) => r.cuentas_analytics?.id).filter(Boolean))
  )
  const vinculosPorCuenta = new Map<string, { id: string; nombre: string }[]>()
  if (tipo === 'competencia' && cuentaIds.length > 0) {
    const { data: vinc } = await admin
      .from('competencia_modelos')
      .select('cuenta_id, modelos ( id, full_name, model_name )')
      .in('cuenta_id', cuentaIds)
    for (const v of (vinc ?? []) as any[]) {
      const m = v.modelos
      if (!m) continue
      const arr = vinculosPorCuenta.get(v.cuenta_id) ?? []
      arr.push({ id: m.id, nombre: m.model_name || m.full_name })
      vinculosPorCuenta.set(v.cuenta_id, arr)
    }
  }

  const reels = (data ?? []).map((r: any) => {
    const cuenta = r.cuentas_analytics
    const modelo = cuenta?.modelos
    const nicho = cuenta?.nichos
    return {
      url: r.url,
      thumbnail_url: r.thumbnail_url,
      caption: r.caption,
      views: r.views,
      likes: r.likes,
      comentarios: r.comentarios,
      ratio_vl: r.ratio_vl,
      fecha_publicacion: r.fecha_publicacion,
      ig_username: cuenta?.ig_username,
      grupo: cuenta?.grupo_competencia || cuenta?.ig_username,
      modelo_nombre: modelo?.model_name || modelo?.full_name || cuenta?.grupo_competencia || cuenta?.ig_username,
      nicho_id: nicho?.id ?? null,
      nicho_nombre: nicho?.nombre ?? 'Sin nicho',
      nicho_color: nicho?.color ?? '#8B8B9E',
      modelos_ref: vinculosPorCuenta.get(cuenta?.id) ?? [],
    }
  })

  return NextResponse.json({ reels })
}
