// app/api/cron/sync-infloww/route.ts
// Trae las ventas de Infloww y las mete en la tabla `ventas` (upsert).
// Reemplaza el escenario de Make "Infloww → Caja | Ventas".
// Protegido con CRON_SECRET, igual que /api/cron/sync-all.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCreators, getTransactions, mapTransaction, type VentaRow } from '@/lib/infloww'

export const maxDuration = 300 // hasta 5 min

// Cuántas horas hacia atrás pedir en cada corrida (con solape para no dejar huecos;
// el upsert por infloww_id evita duplicados). Configurable con INFLOWW_LOOKBACK_HOURS.
const LOOKBACK_HOURS = Number(process.env.INFLOWW_LOOKBACK_HOURS ?? '8')

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 })
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

  const sinceISO = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString()

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

      const txs = await getTransactions(c.id, sinceISO)
      if (txs.length === 0) continue

      const filas = txs.map((t) => {
        const row: VentaRow & { modelo_id: string | null } = {
          ...mapTransaction(c.id, t),
          modelo_id: modeloId,
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

  return NextResponse.json({
    ok: true,
    desde: sinceISO,
    creators: creators.length,
    modelos_automapeados: automapeados,
    ventas_procesadas: insertadas,
    ventas_sin_modelo_mapeado: sinModelo,
    fallidos: fallos.length,
    fallos,
  })
}
