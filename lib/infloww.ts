// lib/infloww.ts
// Cliente de la API de Infloww (OnlyFans). Reemplaza el escenario de Make
// "Infloww → Caja | Ventas".  Docs base: https://openapi.infloww.com/v1
const BASE = 'https://openapi.infloww.com/v1'
const API_KEY = process.env.INFLOWW_API_KEY
const OID = process.env.INFLOWW_OID

interface InflowwCreator {
  id: string
  name?: string
  username?: string
}

interface InflowwTransaction {
  id: string
  transactionId?: string
  fanId?: string
  fanName?: string
  createdTime: number | string // unix ms
  amount: number // en centavos
  fee?: number // en centavos
  type?: string
  tipSource?: string
  status?: string // done | undo | pending_return | ...
}

// Fila lista para upsert en la tabla `ventas`
export interface VentaRow {
  infloww_id: string
  transaction_id: string | null
  creator_id_infloww: string
  fan_id: string | null
  fan_name: string | null
  fecha: string // ISO
  monto_bruto: number
  fee_of: number
  tipo: string | null
  tip_source: string | null
  estado: 'Completado' | 'Reverso' | 'Revision'
}

function headers(): Record<string, string> {
  if (!API_KEY || !OID) throw new Error('Faltan INFLOWW_API_KEY o INFLOWW_OID en las variables de entorno')
  return { Authorization: API_KEY, 'x-oid': OID }
}

async function inflowwGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error(`Infloww ${path} → ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

// Lista de creators (modelos) de la cuenta
export async function getCreators(): Promise<InflowwCreator[]> {
  const r = await inflowwGet<{ data: { list: InflowwCreator[] } }>('/creators', {
    platformCode: 'OnlyFans',
    limit: '100',
  })
  return r?.data?.list ?? []
}

// Transacciones de un creator desde `sinceISO`
export async function getTransactions(creatorId: string, sinceISO: string): Promise<InflowwTransaction[]> {
  const r = await inflowwGet<{ data: { list: InflowwTransaction[] } }>('/transactions', {
    creatorId,
    platformCode: 'OnlyFans',
    startTime: sinceISO,
    limit: '100',
  })
  return r?.data?.list ?? []
}

function mapEstado(status?: string): VentaRow['estado'] {
  if (status === 'done') return 'Completado'
  if (status === 'undo' || status === 'pending_return') return 'Reverso'
  return 'Revision'
}

// Convierte una transacción de Infloww en una fila de `ventas`
export function mapTransaction(creatorId: string, t: InflowwTransaction): VentaRow {
  const ms = typeof t.createdTime === 'string' ? Number(t.createdTime) : t.createdTime
  return {
    infloww_id: String(t.id),
    transaction_id: t.transactionId ? String(t.transactionId) : null,
    creator_id_infloww: creatorId,
    fan_id: t.fanId ? String(t.fanId) : null,
    fan_name: t.fanName ?? null,
    fecha: new Date(ms).toISOString(),
    monto_bruto: (t.amount ?? 0) / 100,
    fee_of: (t.fee ?? 0) / 100,
    tipo: t.type ?? null,
    tip_source: t.tipSource ?? null,
    estado: mapEstado(t.status),
  }
}

export type { InflowwCreator, InflowwTransaction }
