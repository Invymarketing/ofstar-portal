// lib/content-snare.ts
// Cerebro de Content Snare: guarda/lee el token OAuth en Supabase (tabla integraciones_oauth),
// lo refresca solo cuando caduca, y expone un helper para llamar a la API.
import { createAdminClient } from '@/lib/supabase/admin'

const TOKEN_URL = 'https://api.contentsnare.com/oauth/token'
const API_BASE = 'https://api.contentsnare.com/partner_api/v1'
const SERVICIO = 'contentsnare'

type TokenRow = {
  access_token: string | null
  refresh_token: string | null
  expira_en: string | null
}

// Guarda (o actualiza) el token en la tabla. Un solo registro para toda la agencia.
export async function guardarToken(access: string, refresh: string, expiraEnSegundos: number) {
  const admin = createAdminClient()
  const expira = new Date(Date.now() + expiraEnSegundos * 1000).toISOString()
  await admin.from('integraciones_oauth').upsert({
    servicio: SERVICIO,
    access_token: access,
    refresh_token: refresh,
    expira_en: expira,
    actualizado_en: new Date().toISOString(),
  })
}

// Intercambia un "code" (del callback) por el primer token.
export async function intercambiarCode(code: string): Promise<void> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.CONTENTSNARE_CLIENT_ID!,
    client_secret: process.env.CONTENTSNARE_CLIENT_SECRET!,
    redirect_uri: process.env.CONTENTSNARE_REDIRECT_URI!,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error('No se pudo intercambiar el code: ' + (await res.text()))
  const data = await res.json()
  await guardarToken(data.access_token, data.refresh_token, data.expires_in ?? 7200)
}

// Usa el refresh_token para conseguir un access_token nuevo.
async function refrescarToken(refresh: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refresh,
    client_id: process.env.CONTENTSNARE_CLIENT_ID!,
    client_secret: process.env.CONTENTSNARE_CLIENT_SECRET!,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error('No se pudo refrescar el token: ' + (await res.text()))
  const data = await res.json()
  await guardarToken(data.access_token, data.refresh_token ?? refresh, data.expires_in ?? 7200)
  return data.access_token
}

// Devuelve un access_token VÁLIDO: si el guardado sigue vigente lo usa;
// si le quedan menos de 5 min o ya caducó, lo refresca antes de devolverlo.
export async function getTokenValido(): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('integraciones_oauth')
    .select('access_token, refresh_token, expira_en')
    .eq('servicio', SERVICIO)
    .single<TokenRow>()

  if (!data?.access_token || !data.refresh_token) {
    throw new Error('Content Snare no está autorizado todavia. Falta pasar por el callback una vez.')
  }
  const margenMs = 5 * 60 * 1000
  const caduca = data.expira_en ? new Date(data.expira_en).getTime() : 0
  if (Date.now() > caduca - margenMs) {
    return await refrescarToken(data.refresh_token)
  }
  return data.access_token
}

// Helper para llamar a la API de Content Snare con el token ya resuelto.
export async function csFetch(path: string): Promise<any> {
  const token = await getTokenValido()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Content Snare ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}

// --- Conteo de contenido OnlyFans por modelo ---

// Dado el id de cliente (acc_XXXX), devuelve su solicitud ACTIVA de la semana
// (published o waiting). Si tiene varias, coge la de fecha límite más reciente.
export async function solicitudActivaDeCliente(accId: string): Promise<any | null> {
  // El listado /requests NO trae primary_client_id ni los conteos (solo id/status/name/due).
  // Así que: 1) listamos, 2) filtramos las activas, 3) pedimos el detalle de cada una
  //          (que sí trae primary_client_id + conteos) y nos quedamos con las de este cliente.
  const data = await csFetch('/requests')
  const reqs: any[] = Array.isArray(data) ? data : (data.results ?? [])
  const activas = reqs.filter((r) => ['published', 'waiting'].includes(r.status))

  const detalles = await Promise.all(
    activas.map((r) => csFetch('/requests/' + r.id).catch(() => null))
  )
  const mias = detalles.filter(
    (d): d is any => d != null && d.primary_client_id === accId
  )
  if (mias.length === 0) return null
  // si tuviera varias activas, la de fecha límite más reciente
  mias.sort((a, b) => (b.due ?? '').localeCompare(a.due ?? ''))
  return mias[0]
}

// Devuelve el conteo de OnlyFans para una modelo, a partir de su acc de CS.
export async function contenidoOnlyFans(accId: string) {
  const solicitud = await solicitudActivaDeCliente(accId)
  if (!solicitud) {
    return { encontrado: false as const }
  }
  // el listado ya trae fields_count/done_fields_count/completion_percentage
  return {
    encontrado: true as const,
    nombre: solicitud.name as string,
    total: (solicitud.fields_count ?? 0) as number,
    entregado: (solicitud.done_fields_count ?? 0) as number,
    porcentaje: (solicitud.completion_percentage ?? 0) as number,
    limite: (solicitud.due ?? null) as string | null,
    estado: solicitud.status as string,
  }
}
