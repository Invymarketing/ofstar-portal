import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

async function precioDeVa(admin: ReturnType<typeof createAdminClient>, vaId: string): Promise<number> {
  const { data: cfg } = await admin.from('va_config').select('precio_por_cuenta').eq('va_id', vaId).maybeSingle()
  if (cfg && cfg.precio_por_cuenta != null) return Number(cfg.precio_por_cuenta)
  const { data: aj } = await admin.from('ajustes_va').select('precio_por_cuenta').eq('id', 1).maybeSingle()
  return Number(aj?.precio_por_cuenta ?? 0.375)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['va', 'admin', 'manager'].includes(role)) return NextResponse.json({ error: 'no' }, { status: 403 })

  const fecha = hoyMadrid()
  const precio = await precioDeVa(admin, user.id)

  const { data: cuentas } = await admin
    .from('cuentas_analytics')
    .select('id, ig_username, es_principal, modelos ( model_name )')
    .eq('activa', true)
    .neq('tipo', 'competencia')
    .order('ig_username')

  const lista = (cuentas ?? []).map((c: Record<string, unknown>) => {
    const mm = Array.isArray(c.modelos) ? c.modelos[0] : c.modelos
    return {
      id: c.id as string,
      ig_username: c.ig_username as string,
      modelo: ((mm as { model_name?: string } | null)?.model_name) ?? 'Sin modelo',
      es_principal: !!c.es_principal,
    }
  })

  const ids = lista.map((c) => c.id)
  const { data: regs } = ids.length
    ? await admin.from('registro_va').select('*').eq('fecha', fecha).eq('va_id', user.id).in('cuenta_id', ids)
    : { data: [] }
  const byCuenta = new Map<string, Record<string, unknown>>()
  for (const r of (regs ?? []) as Record<string, unknown>[]) byCuenta.set(r.cuenta_id as string, r)

  const cuentasOut = lista.map((c) => {
    const r = byCuenta.get(c.id)
    return {
      ...c,
      actividad: !!r?.check_actividad,
      historia: !!r?.check_historia,
      reel: !!r?.check_reel,
      completada: !!r?.completada,
    }
  })
  const completadas = cuentasOut.filter((c) => c.completada).length
  return NextResponse.json({ fecha, precio, completadas, ganado: +(completadas * precio).toFixed(2), cuentas: cuentasOut })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no' }, { status: 403 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['va', 'admin', 'manager'].includes(role)) return NextResponse.json({ error: 'no' }, { status: 403 })

  const body = await req.json()
  const cuenta_id = String(body.cuenta_id ?? '')
  const tarea = String(body.tarea ?? '')
  const valor = !!body.valor
  if (!cuenta_id || !['actividad', 'historia', 'reel'].includes(tarea)) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const fecha = hoyMadrid()
  const precio = await precioDeVa(admin, user.id)
  const ahora = new Date().toISOString()

  const { data: ex } = await admin.from('registro_va').select('*').eq('fecha', fecha).eq('va_id', user.id).eq('cuenta_id', cuenta_id).maybeSingle()
  const fila: Record<string, unknown> = ex ?? { fecha, va_id: user.id, cuenta_id, check_actividad: false, check_historia: false, check_reel: false, ts_actividad: null, ts_historia: null, ts_reel: null }
  if (tarea === 'actividad') { fila.check_actividad = valor; fila.ts_actividad = valor ? ahora : null }
  if (tarea === 'historia') { fila.check_historia = valor; fila.ts_historia = valor ? ahora : null }
  if (tarea === 'reel') { fila.check_reel = valor; fila.ts_reel = valor ? ahora : null }
  const completa = !!fila.check_actividad && !!fila.check_historia && !!fila.check_reel
  fila.completada = completa
  if (completa) {
    if (!fila.ts_completada) fila.ts_completada = ahora
    if (fila.precio_snapshot == null) fila.precio_snapshot = precio
  } else {
    fila.ts_completada = null
    fila.precio_snapshot = null
  }

  const payload = {
    fecha: fila.fecha, va_id: fila.va_id, cuenta_id: fila.cuenta_id,
    check_actividad: fila.check_actividad, ts_actividad: fila.ts_actividad,
    check_historia: fila.check_historia, ts_historia: fila.ts_historia,
    check_reel: fila.check_reel, ts_reel: fila.ts_reel,
    completada: fila.completada, ts_completada: fila.ts_completada, precio_snapshot: fila.precio_snapshot,
  }
  await admin.from('registro_va').upsert(payload, { onConflict: 'fecha,va_id,cuenta_id' })

  return NextResponse.json({ ok: true })
}
