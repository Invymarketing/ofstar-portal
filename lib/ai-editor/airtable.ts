// Lee la cola de edición desde Airtable (tabla "Edicion Videos").
const TOKEN = process.env.AIRTABLE_TOKEN || ''
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appJ6YF9DeBfJO9Pc'
const TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblNjIPEnCR1pqgZL'

const F = {
  editarHoy: 'fldHmc7OURDj74Pzj',
  modeloName: 'fldvfzP9KXc5f0L3w', // formula: nombre de la modelo como texto
  fecha: 'fldM9zR9pIrwLtbme',
}

// Columna del vídeo EN BRUTO para cada D#
const BRUTO: Record<string, string> = {
  Principal: 'fldyPR0GvrzZkpppN',
  D2: 'flduDVRUFDlpbEisv',
  D3: 'fldcKVWPwKNjPRrQq',
  D4: 'fldOQzJPdblcZ34VC',
  D5: 'fldakiTXtFM7ocqKy',
  D6: 'fldREx1UuyFXQULB8',
  D7: 'fldVGoKGXLLWAOsmi',
  D8: 'fldq8r4LEXOMX34tz',
  D9: 'fldN9qx8yQrEjHts9',
  D10: 'fldLMRPNKp8JmIoqV',
}

export function airtableConfigured(): boolean {
  return Boolean(TOKEN)
}

export interface QueueTask {
  recordId: string
  modelo: string
  dNum: string
  urgencia: string
  urgenciaRank: number
  fecha: string | null
  sourceUrl: string | null
  sourceFilename: string | null
}

function rankUrgencia(u: string): number {
  const o = ['ATRASADO', 'HOY', 'MAÑANA', 'PASADO MAÑANA', 'EN 3 DÍAS']
  const i = o.indexOf(u)
  return i < 0 ? 99 : i
}

function parseEditarHoy(s: string): { urgencia: string; d: string }[] {
  const out: { urgencia: string; d: string }[] = []
  for (const p of String(s).split('·')) {
    const m = p.match(/(ATRASADO|HOY|MAÑANA|PASADO MAÑANA|EN 3 DÍAS)\s*→\s*(Principal|D\d+)/i)
    if (m) out.push({ urgencia: m[1].toUpperCase(), d: m[2] })
  }
  return out
}

type AtRecord = { id: string; fields: Record<string, unknown> }

function attachmentUrl(v: unknown): { url: string | null; filename: string | null } {
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0]) {
    const a = v[0] as { url?: string; filename?: string }
    return { url: a.url ?? null, filename: a.filename ?? null }
  }
  return { url: null, filename: null }
}

async function fetchAllRecords(): Promise<AtRecord[]> {
  const fields = [F.editarHoy, F.modeloName, F.fecha, ...Object.values(BRUTO)]
  const records: AtRecord[] = []
  let offset: string | undefined
  do {
    const params = new URLSearchParams()
    params.set('returnFieldsByFieldId', 'true')
    params.set('pageSize', '100')
    fields.forEach((f) => params.append('fields[]', f))
    if (offset) params.set('offset', offset)
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = (await res.json()) as { records: AtRecord[]; offset?: string }
    records.push(...(data.records ?? []))
    offset = data.offset
  } while (offset)
  return records
}

export async function getQueue(): Promise<QueueTask[]> {
  if (!TOKEN) throw new Error('Falta AIRTABLE_TOKEN en el servidor.')
  const records = await fetchAllRecords()
  const tasks: QueueTask[] = []
  for (const r of records) {
    const f = r.fields
    const editarHoy = typeof f[F.editarHoy] === 'string' ? (f[F.editarHoy] as string) : ''
    if (!editarHoy) continue
    const modelo = typeof f[F.modeloName] === 'string' && f[F.modeloName] ? (f[F.modeloName] as string) : '—'
    const fecha = typeof f[F.fecha] === 'string' ? (f[F.fecha] as string) : null
    for (const { urgencia, d } of parseEditarHoy(editarHoy)) {
      const brutoField = BRUTO[d]
      const { url, filename } = brutoField ? attachmentUrl(f[brutoField]) : { url: null, filename: null }
      tasks.push({
        recordId: r.id,
        modelo,
        dNum: d,
        urgencia,
        urgenciaRank: rankUrgencia(urgencia),
        fecha,
        sourceUrl: url,
        sourceFilename: filename,
      })
    }
  }
  tasks.sort((a, b) => a.urgenciaRank - b.urgenciaRank || (a.fecha ?? '').localeCompare(b.fecha ?? ''))
  return tasks
}
