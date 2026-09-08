import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Mes (YYYY-MM) en hora de España de una fecha ISO
function mesMadrid(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).format(new Date(iso)).slice(0, 7)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  const reveal = ['admin', 'manager'].includes(role)

  let miModeloId: string | null = null
  if (role === 'modelo') {
    const { data: f } = await admin.from('modelos').select('id').eq('user_id', user.id).maybeSingle()
    miModeloId = f?.id ?? null
  }

  const mesActual = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7)

  const { data: snaps } = await admin
    .from('cumplimiento_semanal')
    .select('modelo_id, puntuacion, semana_fin, modelos ( model_name, full_name )')

  const acc = new Map<string, { suma: number; n: number; nombre: string }>()
  for (const s of (snaps ?? []) as any[]) {
    if (!s.semana_fin || mesMadrid(s.semana_fin) !== mesActual) continue
    if (!s.modelo_id) continue
    const nombre = s.modelos?.model_name || s.modelos?.full_name || 'Modelo'
    const cur = acc.get(s.modelo_id) ?? { suma: 0, n: 0, nombre }
    cur.suma += Number(s.puntuacion ?? 0)
    cur.n += 1
    cur.nombre = nombre
    acc.set(s.modelo_id, cur)
  }

  const lista = [...acc.entries()]
    .map(([modelo_id, v]) => ({ modelo_id, pct: Math.round(v.suma / v.n), nombre: v.nombre }))
    .sort((a, b) => b.pct - a.pct)

  const ranking = lista.map((r, i) => {
    const esYo = r.modelo_id === miModeloId
    return { pos: i + 1, pct: r.pct, esYo, nombre: (reveal || esYo) ? r.nombre : null }
  })
  const yo = ranking.find(r => r.esYo) ?? null

  return NextResponse.json({ mes: mesActual, ranking, yo })
}
