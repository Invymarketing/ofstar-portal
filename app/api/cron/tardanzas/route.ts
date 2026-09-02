// app/api/cron/tardanzas/route.ts
// Revisa quién no ha fichado a tiempo según su horario y avisa (campana) a la
// team leader de su equipo. Pensado para correr cada ~10 min (vercel.json).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60

// Colombia = UTC-5 (sin horario de verano)
const COL_OFFSET_MS = 5 * 3600 * 1000
const GRACIA_MIN = 15          // minutos de tolerancia
const VENTANA_MIN = 60         // solo avisa dentro de la 1ª hora del turno

// Hora de inicio (hora Colombia) por turno. Normalizamos sin acentos.
const HORA_INICIO: Record<string, number> = { manana: 7, tarde: 15, noche: 23 }
const norm = (s: string | null) => (s ?? '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')

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
  } catch { return false }
}

// Partes de una fecha (Y/M/D) en hora Colombia para un instante dado
function fechaColombia(ms: number): { y: number; m: number; d: number; str: string } {
  const str = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(ms))
  const [y, m, d] = str.split('-').map(Number)
  return { y, m, d, str }
}

export async function GET(request: NextRequest) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = Date.now()

  // Candidatos de fecha de turno: hoy y ayer (para cubrir el turno Noche que cruza medianoche)
  const cand = [fechaColombia(now), fechaColombia(now - 86400000)]

  const [{ data: chatters }, { data: tls }, { data: jornadas }, { data: yaAlertadas }] = await Promise.all([
    admin.from('chatters').select('id, nombre, turno, equipo, dias_descanso, profile_id, activo').eq('activo', true),
    admin.from('profiles').select('id, equipo').eq('role', 'team_leader'),
    admin.from('jornadas').select('user_id, inicio').gte('inicio', new Date(now - 14 * 3600 * 1000).toISOString()),
    admin.from('alertas_tardanza').select('chatter_id, fecha').gte('fecha', cand[1].str),
  ])

  // fichajes por persona (para saber si ya entró)
  const fichajes = new Map<string, number[]>()
  for (const j of jornadas ?? []) {
    const arr = fichajes.get(j.user_id) ?? []
    arr.push(+new Date(j.inicio))
    fichajes.set(j.user_id, arr)
  }

  const alertadas = new Set((yaAlertadas ?? []).map((a) => `${a.chatter_id}|${a.fecha}`))
  const todasTL = (tls ?? []).map((t) => t.id)
  const destinatarios = (equipo: number | null): string[] => {
    if (equipo != null) {
      const match = (tls ?? []).filter((t) => t.equipo === equipo).map((t) => t.id)
      if (match.length) return match
    }
    return todasTL // si no hay TL de ese equipo, avisa a todas
  }

  const avisos: { chatter: string; equipo: number | null; turno: string; fecha: string; a: number }[] = []

  for (const c of chatters ?? []) {
    if (!c.profile_id || !c.turno) continue
    const hora = HORA_INICIO[norm(c.turno)]
    if (hora == null) continue
    const descansos = c.dias_descanso ?? []

    for (const f of cand) {
      // inicio del turno (hora Colombia) expresado en UTC
      const inicioTurno = Date.UTC(f.y, f.m - 1, f.d, hora, 0, 0) + COL_OFFSET_MS
      const desde = inicioTurno + GRACIA_MIN * 60000
      const hasta = inicioTurno + VENTANA_MIN * 60000
      if (now < desde || now > hasta) continue

      // ¿ese día es descanso? (getDay de esa fecha calendario)
      const diaSemana = new Date(Date.UTC(f.y, f.m - 1, f.d)).getUTCDay()
      if (descansos.includes(diaSemana)) break

      // ¿ya está alertado hoy?
      if (alertadas.has(`${c.id}|${f.str}`)) break

      // ¿ya fichó? (alguna jornada iniciada desde 1h antes del turno)
      const misFichajes = fichajes.get(c.profile_id) ?? []
      const ficho = misFichajes.some((t) => t >= inicioTurno - 3600000)
      if (ficho) break

      // → Tardanza confirmada. Registrar (dedupe) y notificar.
      const { error: dupErr } = await admin.from('alertas_tardanza')
        .insert({ chatter_id: c.id, fecha: f.str, turno: c.turno })
      if (dupErr) break // si chocó la PK, otra corrida ya avisó

      const dest = destinatarios(c.equipo)
      if (dest.length) {
        await admin.from('notifications').insert(dest.map((uid) => ({
          user_id: uid,
          title: '⏰ Chatter sin fichar',
          body: `${c.nombre}${c.equipo ? ` (Equipo ${c.equipo})` : ''} no ha fichado su turno ${c.turno} (${hora}:00). Ya pasaron ${GRACIA_MIN} min.`,
          module_id: 15,
          link: '/modulo-15',
        })))
      }
      avisos.push({ chatter: c.nombre, equipo: c.equipo, turno: c.turno, fecha: f.str, a: dest.length })
      break
    }
  }

  return NextResponse.json({ ok: true, revisados: (chatters ?? []).length, avisos_enviados: avisos.length, avisos })
}
