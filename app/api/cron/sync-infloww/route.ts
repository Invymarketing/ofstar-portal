// app/api/cron/sync-infloww/route.ts
// Trae las ventas de Infloww y las mete en la tabla `ventas` (upsert).
// Reemplaza el escenario de Make "Infloww → Caja | Ventas".
// Protegido con CRON_SECRET, igual que /api/cron/sync-all.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCreators, getTransactions, mapTransaction, type VentaRow } from '@/lib/infloww'

export const maxDuration = 300 // hasta 5 min

// Ventana por defecto (horas hacia atrás) en cada corrida automática. Con solape
// para no dejar huecos; el upsert por infloww_id evita duplicados.
// Se puede sobreescribir por corrida con ?hours=N  (o ?days=N), útil para backfill.
const LOOKBACK_HOURS = Number(process.env.INFLOWW_LOOKBACK_HOURS ?? '8')

// Autoriza si (a) trae el Bearer del cron, o (b) es un admin/manager logueado
// en el CRM (para poder disparar el sync desde el navegador o un botón).
async function autorizado(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth === `Bearer ${secret}`) return true

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const admin = createAdminClient()
    const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
    return !!me && ['admin', 'manager'].includes(me.role)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)

  // Ventana de tiempo: ?hours=N tiene prioridad, luego ?days=N, luego el valor por defecto.
  const hoursParam = Number(url.searchParams.get('hours'))
  const daysParam = Number(url.searchParams.get('days'))
  let lookbackHours = LOOKBACK_HOURS
  if (Number.isFinite(hoursParam) && hoursParam > 0) lookbackHours = hoursParam
  else if (Number.isFinite(daysParam) && daysParam > 0) lookbackHours = daysParam * 24

  const sinceISO = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString()

  // Modo debug: muestra los campos crudos de una transacción de Infloww. Uso: ...?debug=1
  if (url.searchParams.get('debug')) {
    try {
      const creators = await getCreators()
      for (const c of creators) {
        const txs = await getTransactions(c.id, sinceISO)
        if (txs.length > 0) {
          return NextResponse.json({
            desde: sinceISO,
            horas_ventana: lookbackHours,
            creator_sample: c,
            transaction_keys: Object.keys(txs[0]),
            transaction_sample: txs[0],
            transacciones_primer_creator: txs.length,
          })
        }
      }
      return NextResponse.json({ creators: creators.length, nota: `sin transacciones en ${lookbackHours}h` })
    } catch (err) {
      return NextResponse.json({ error: 'debug', detalle: String(err) }, { status: 502 })
    }
  }

  // Modo resumen: suma lo que la API devuelve, por modelo, distinguiendo el mes actual.
  // Sirve para comparar directo contra el "Creator earnings overview" de Infloww. Uso: ...?resumen=1&hours=800
  if (url.searchParams.get('resumen')) {
    try {
      const now = new Date()
      const inicioMes = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const creators = await getCreators()
      const out: Record<string, unknown>[] = []
      let granVentana = 0, granMes = 0

      for (const c of creators) {
        const txs = await getTransactions(c.id, sinceISO)
        let sum = 0, sumMes = 0, nMes = 0, subs = 0, tips = 0, msgs = 0, otros = 0
        const estados = new Set<string>()
        const tipos = new Set<string>()
        for (const t of txs) {
          const amt = Number(t.amount ?? 0) / 100
          const ms = typeof t.createdTime === 'string' ? Number(t.createdTime) : t.createdTime
          sum += amt
          if (t.status) estados.add(t.status)
          if (t.type) tipos.add(t.type)
          if (ms >= +inicioMes) {
            sumMes += amt; nMes++
            const ty = (t.type ?? '').toLowerCase()
            if (ty.includes('tip')) tips += amt
            else if (ty.includes('subscription')) subs += amt
            else if (ty.includes('message')) msgs += amt
            else otros += amt
          }
        }
        granVentana += sum; granMes += sumMes
        out.push({
          creator: c.name || c.username || c.id,
          tx: txs.length,
          bruto_ventana: Math.round(sum),
          bruto_mes: Math.round(sumMes),
          n_mes: nMes,
          subs_mes: Math.round(subs),
          tips_mes: Math.round(tips),
          msgs_mes: Math.round(msgs),
          otros_mes: Math.round(otros),
          estados: [...estados],
          tipos: [...tipos],
        })
      }

      return NextResponse.json({
        inicio_mes: inicioMes.toISOString(),
        desde: sinceISO,
        gran_total_ventana: Math.round(granVentana),
        gran_total_mes: Math.round(granMes),
        creators: out.sort((a, b) => (b.bruto_mes as number) - (a.bruto_mes as number)),
      })
    } catch (err) {
      return NextResponse.json({ error: 'resumen', detalle: String(err) }, { status: 502 })
    }
  }

  const admin = createAdminClient()

  // Modelos: mapa por creator_id_infloww y por nombre normalizado (para auto-mapear)
  const { data: modelos } = await admin
    .from('modelos')
    .select('id, model_name, creator_id_infloww')
  const norm = (s?: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const modeloPorCreator = new Map<string, string>()
  const modeloPorNombre = new Map<string, string>()
  for (const m of modelos ?? []) {
    if (m.creator_id_infloww) modeloPorCreator.set(String(m.creator_id_infloww), m.id)
    if (m.model_name) modeloPorNombre.set(norm(m.model_name), m.id)
  }

  let creators: { id: string; name?: string; username?: string }[] = []
  try {
    creators = await getCreators()
  } catch (err) {
    return NextResponse.json({ error: 'infloww_creators', detalle: String(err) }, { status: 502 })
  }

  let insertadas = 0
  let sinModelo = 0
  let automapeados = 0
  const fallos: { creator: string; motivo: string }[] = []

  for (const c of creators) {
    try {
      // ¿Está mapeado por ID? Si no, intenta por nombre y hace backfill del ID.
      let modeloId = modeloPorCreator.get(String(c.id)) ?? null
      if (!modeloId) {
        modeloId = modeloPorNombre.get(norm(c.name)) ?? modeloPorNombre.get(norm(c.username)) ?? null
        if (modeloId) {
          await admin.from('modelos').update({ creator_id_infloww: String(c.id) }).eq('id', modeloId)
          modeloPorCreator.set(String(c.id), modeloId)
          automapeados++
        }
      }

      // Reasigna las ventas viejas de este creator que quedaron sin modelo
      if (modeloId) {
        await admin.from('ventas')
          .update({ modelo_id: modeloId })
          .eq('creator_id_infloww', String(c.id))
          .is('modelo_id', null)
      }

      const txs = await getTransactions(c.id, sinceISO)
      if (txs.length === 0) continue

      const creatorName = c.name || c.username || null
      const filas = txs.map((t) => {
        const row: VentaRow & { modelo_id: string | null; creator_name: string | null } = {
          ...mapTransaction(c.id, t),
          modelo_id: modeloId,
          creator_name: creatorName,
        }
        if (!row.modelo_id) sinModelo++
        return row
      })

      const { error } = await admin
        .from('ventas')
        .upsert(filas, { onConflict: 'infloww_id', ignoreDuplicates: false })
      if (error) throw new Error(error.message)
      insertadas += filas.length
    } catch (err) {
      fallos.push({ creator: c.id, motivo: String(err) })
    }
  }

  // Cruza reportes de chatters pendientes con las ventas reales recién llegadas
  let atribuidas = 0
  try {
    const { data } = await admin.rpc('reconciliar_ventas')
    atribuidas = (data as number) ?? 0
  } catch {
    // si aún no existe la función/tabla, no rompe el sync
  }

  return NextResponse.json({
    ok: true,
    desde: sinceISO,
    horas_ventana: lookbackHours,
    creators: creators.length,
    modelos_automapeados: automapeados,
    ventas_procesadas: insertadas,
    ventas_sin_modelo_mapeado: sinModelo,
    ventas_atribuidas_a_chatter: atribuidas,
    fallidos: fallos.length,
    fallos,
  })
}
