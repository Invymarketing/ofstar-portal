import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAccessibleModules } from '@/lib/modules'
import { ROLE_LABELS } from '@/lib/roles'
import ModuleCard from '@/components/ui/ModuleCard'
import {
  ExternalLink, FileText, ListTodo, Users, DollarSign, CheckSquare,
  Target, AlertTriangle, Circle, Coffee, Clock, ClipboardList, TrendingUp,
} from 'lucide-react'
import type { UserRole } from '@/types'
import VentasChart from '@/components/dashboard/VentasChart'
import SerieChart from '@/components/dashboard/SerieChart'

const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

// Quincena Europe/Madrid → { start, end, label }
function quincena() {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = f.split('-').map(Number)
  const q1 = d <= 15
  const mm = String(m).padStart(2, '0')
  const start = `${y}-${mm}-${q1 ? '01' : '16'}T00:00:00Z`
  let end: string
  if (q1) end = `${y}-${mm}-16T00:00:00Z`
  else { const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y; end = `${ny}-${String(nm).padStart(2, '0')}-01T00:00:00Z` }
  return { start, end, label: `${y}-${mm}-${q1 ? 'Q1' : 'Q2'}` }
}

// Medianoche de HOY en hora de Madrid (Europe/Madrid), expresada en UTC ISO,
// para que "Ventas de hoy" cuadre con el "Hoy" del panel de Ventas.
function inicioHoyISO() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = p.split('-').map(Number)
  const offStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', timeZoneName: 'shortOffset' })
    .formatToParts(new Date(Date.UTC(y, m - 1, d)))
    .find((x) => x.type === 'timeZoneName')?.value ?? 'GMT+0'
  const signo = offStr.includes('-') ? -1 : 1
  const horas = Number(offStr.replace(/[^0-9]/g, '')) || 0
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - signo * horas * 3600000).toISOString()
}

function fechaMadrid(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

function minutosDesde(iso: string) {
  return Math.floor((Date.now() - +new Date(iso)) / 60000)
}

// ── Turno en curso según horario (hora Colombia, UTC-5) ──────
const COL_OFFSET_MS = 5 * 3600 * 1000
const HORA_INICIO: Record<string, number> = { manana: 7, tarde: 15, noche: 23 }
const normTurno = (s: string | null) => (s ?? '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')

// Si el turno está en curso ahora, devuelve el día de la semana (getDay) de la fecha del turno; si no, null.
function turnoActivoAhora(turno: string | null): number | null {
  const h = HORA_INICIO[normTurno(turno)]
  if (h == null) return null
  const now = Date.now()
  for (const off of [0, 86400000]) {
    const str = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now - off))
    const [y, m, d] = str.split('-').map(Number)
    const inicio = Date.UTC(y, m - 1, d, h, 0, 0) + COL_OFFSET_MS
    if (now >= inicio && now < inicio + 8 * 3600 * 1000) {
      return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    }
  }
  return null
}

// ── Tarjeta KPI ──────────────────────────────────────────────
function Kpi({ icon, label, value, sub, tone = 'default', subColor }: {
  icon: React.ReactNode; label: string; value: string; sub?: string
  tone?: 'default' | 'gold' | 'green' | 'red'; subColor?: string
}) {
  const color = tone === 'gold' ? 'var(--gold)' : tone === 'green' ? '#4ADE80' : tone === 'red' ? '#F87171' : 'var(--foreground)'
  return (
    <div className="rounded-xl px-4 py-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--muted)' }}>
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: subColor ?? 'rgba(107,107,128,0.7)' }}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>{children}</h2>
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name, content_snare_url, notion_url')
    .eq('id', user!.id)
    .single()

  const role = (profile?.role ?? 'chatter') as UserRole
  const fullName = profile?.full_name ?? ''
  const firstName = fullName.split(' ')[0]
  const modules = getAccessibleModules(role)

  const esStaff = ['admin', 'manager', 'team_leader'].includes(role)
  const esAdminOManager = ['admin', 'manager'].includes(role)
  const esChatter = role === 'chatter'

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Datos del dashboard STAFF ──────────────────────────────
  let staff: null | {
    online: { nombre: string; enBreak: boolean; desde: string }[]
    ventasHoy: number
    ventasAyer: number
    ranking: { nombre: string; total: number }[]
    tareasPend: number
    metaPct: number | null
    metaChatters: number
    alertas: { nombre: string; min: number }[]
    sinFichar: string[]
    turnosLargos: { nombre: string; horas: number }[]
    turnoAhora: { esperados: number; presentes: number; faltan: { nombre: string; equipo: number | null }[] }
    novedades: { texto: string; created_at: string; equipo: number | null }[]
  } = null

  if (esStaff) {
    const inicioHoy = inicioHoyISO()
    const inicioAyer = new Date(new Date(inicioHoy).getTime() - 86400000).toISOString()
    const { start: qStart, end: qEnd } = quincena()

    const [jAbiertas, dAbiertos, ventasHoyRows, ventasAyerRows, tareasPendRows, chattersAct, ventasQ, handoffs, personas, jornadasHoy] = await Promise.all([
      admin.from('jornadas').select('user_id, inicio').is('fin', null),
      admin.from('descansos').select('user_id, inicio').is('fin', null),
      admin.from('ventas').select('chatter_id, monto_bruto, estado').gte('fecha', inicioHoy),
      admin.from('ventas').select('monto_bruto, estado').gte('fecha', inicioAyer).lt('fecha', inicioHoy),
      admin.from('tareas').select('id').is('completada_at', null),
      admin.from('chatters').select('id, nombre, profile_id, meta_quincena, turno, equipo, dias_descanso').eq('activo', true),
      admin.from('ventas').select('chatter_id, monto_bruto, estado').gte('fecha', qStart).lt('fecha', qEnd),
      admin.from('handoffs').select('texto, created_at, equipo').order('created_at', { ascending: false }).limit(4),
      admin.from('profiles').select('id, full_name'),
      admin.from('jornadas').select('user_id').gte('inicio', inicioHoy),
    ])

    const nombreDe = new Map((personas.data ?? []).map((p) => [p.id, p.full_name]))
    const enBreakSet = new Set((dAbiertos.data ?? []).map((d) => d.user_id))

    const online = (jAbiertas.data ?? []).map((j) => ({
      nombre: nombreDe.get(j.user_id) ?? '—',
      enBreak: enBreakSet.has(j.user_id),
      desde: j.inicio,
    })).sort((a, b) => Number(a.enBreak) - Number(b.enBreak))

    // Ventas de hoy (total) + ranking por chatter
    const chatterNombre = new Map((chattersAct.data ?? []).map((c) => [c.id, c.nombre]))
    const ventasHoyPorChatter = new Map<string, number>()
    let ventasHoy = 0
    for (const v of ventasHoyRows.data ?? []) {
      if (v.estado === 'Reverso') continue
      const monto = Number(v.monto_bruto ?? 0)
      ventasHoy += monto
      if (v.chatter_id) ventasHoyPorChatter.set(v.chatter_id, (ventasHoyPorChatter.get(v.chatter_id) ?? 0) + monto)
    }
    const ranking = [...ventasHoyPorChatter.entries()]
      .map(([id, total]) => ({ nombre: chatterNombre.get(id) ?? '—', total }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    const ventasAyer = (ventasAyerRows.data ?? [])
      .filter((v) => v.estado !== 'Reverso')
      .reduce((s, v) => s + Number(v.monto_bruto ?? 0), 0)

    // Metas de la quincena
    const ventasPorChatter = new Map<string, number>()
    for (const v of ventasQ.data ?? []) {
      if (v.estado === 'Reverso' || !v.chatter_id) continue
      ventasPorChatter.set(v.chatter_id, (ventasPorChatter.get(v.chatter_id) ?? 0) + Number(v.monto_bruto ?? 0))
    }
    const conMeta = (chattersAct.data ?? []).filter((c) => c.meta_quincena != null && Number(c.meta_quincena) > 0)
    const pcts = conMeta.map((c) => Math.min((ventasPorChatter.get(c.id) ?? 0) / Number(c.meta_quincena), 2))
    const metaPct = pcts.length ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 100) : null

    // Cumplimiento de HOY (basado en fichaje)
    const alertas = (dAbiertos.data ?? [])
      .map((d) => ({ nombre: nombreDe.get(d.user_id) ?? '—', min: minutosDesde(d.inicio) }))
      .filter((a) => a.min >= 30)
      .sort((a, b) => b.min - a.min)

    const ficharonHoy = new Set((jornadasHoy.data ?? []).map((j) => j.user_id))
    const sinFichar = (chattersAct.data ?? [])
      .filter((c) => c.profile_id && !ficharonHoy.has(c.profile_id))
      .map((c) => c.nombre)

    const turnosLargos = (jAbiertas.data ?? [])
      .map((j) => ({ nombre: nombreDe.get(j.user_id) ?? '—', horas: Math.round(minutosDesde(j.inicio) / 60 * 10) / 10 }))
      .filter((t) => t.horas >= 10)
      .sort((a, b) => b.horas - a.horas)

    // En turno ahora según horario: esperados vs presentes (fichados con turno abierto)
    const abiertosSet = new Set((jAbiertas.data ?? []).map((j) => j.user_id))
    const esperados: { nombre: string; equipo: number | null; presente: boolean }[] = []
    for (const c of (chattersAct.data ?? []) as { nombre: string; profile_id: string | null; turno: string | null; equipo: number | null; dias_descanso: number[] | null }[]) {
      const diaTurno = turnoActivoAhora(c.turno)
      if (diaTurno == null) continue // no tiene turno en curso ahora
      if ((c.dias_descanso ?? []).includes(diaTurno)) continue // hoy descansa
      esperados.push({
        nombre: c.nombre,
        equipo: c.equipo ?? null,
        presente: !!c.profile_id && abiertosSet.has(c.profile_id),
      })
    }
    const faltan = esperados.filter((e) => !e.presente).map((e) => ({ nombre: e.nombre, equipo: e.equipo }))
    const turnoAhora = { esperados: esperados.length, presentes: esperados.filter((e) => e.presente).length, faltan }

    staff = {
      online,
      ventasHoy,
      ventasAyer,
      ranking,
      tareasPend: (tareasPendRows.data ?? []).length,
      metaPct,
      metaChatters: conMeta.length,
      alertas,
      sinFichar,
      turnosLargos,
      turnoAhora,
      novedades: (handoffs.data ?? []).map((h) => ({ texto: h.texto, created_at: h.created_at, equipo: h.equipo ?? null })),
    }
  }

  // ── Gráficos del panel (solo admin/manager) ────────────────
  let panelCharts: null | {
    hoy: string
    serieVentas: { fecha: string; valor: number }[]
    serieSeguidores: { fecha: string; valor: number }[]
  } = null

  if (esAdminOManager) {
    const hoyMadrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const [hy, hm, hd] = hoyMadrid.split('-').map(Number)
    const hace40 = new Date(Date.UTC(hy, hm - 1, hd) - 40 * 86400000).toISOString()
    const diasP: string[] = []
    for (let i = 39; i >= 0; i--) diasP.push(new Date(Date.UTC(hy, hm - 1, hd) - i * 86400000).toISOString().slice(0, 10))

    const [ventasRows, cuentasProp] = await Promise.all([
      admin.from('ventas').select('monto_bruto, estado, fecha').gte('fecha', hace40),
      admin.from('cuentas_analytics').select('id, metricas_analytics ( fecha, seguidores )').eq('activa', true).neq('tipo', 'competencia'),
    ])

    const bV = new Map<string, number>(diasP.map((f) => [f, 0]))
    for (const v of ventasRows.data ?? []) {
      if ((v as { estado: string }).estado === 'Reverso') continue
      const f = fechaMadrid((v as { fecha: string }).fecha)
      if (bV.has(f)) bV.set(f, (bV.get(f) ?? 0) + Number((v as { monto_bruto: number }).monto_bruto ?? 0))
    }
    const serieVentas = diasP.map((f) => ({ fecha: f, valor: bV.get(f) ?? 0 }))

    const serieSeguidores = diasP.map((dia) => {
      let total = 0
      for (const c of (cuentasProp.data ?? []) as { metricas_analytics?: { fecha: string; seguidores: number }[] }[]) {
        const ms = c.metricas_analytics ?? []
        let val: number | null = null
        let best = ''
        for (const m of ms) {
          if (m.fecha <= dia && m.fecha >= best) { best = m.fecha; val = Number(m.seguidores ?? 0) }
        }
        if (val != null) total += val
      }
      return { fecha: dia, valor: total }
    })

    panelCharts = { hoy: hoyMadrid, serieVentas, serieSeguidores }
  }

  // ── Datos del dashboard CHATTER ────────────────────────────
  let chatter: null | {
    enTurno: boolean; enBreak: boolean
    meta: number | null; ventasQ: number; pct: number | null; falta: number | null
    ventasHoy: number; tareasPend: number; proxTarea: string | null
    serie: { fecha: string; monto: number }[]; quincenaLabel: string; hoy: string
  } = null

  if (esChatter) {
    const inicioHoy = inicioHoyISO()
    const { start: qStart, end: qEnd, label: qLabel } = quincena()

    const hoyMadrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const [hy, hm, hd] = hoyMadrid.split('-').map(Number)
    const hace40 = new Date(Date.UTC(hy, hm - 1, hd) - 40 * 86400000).toISOString()

    const { data: mi } = await admin.from('chatters').select('id, meta_quincena').eq('profile_id', user!.id).maybeSingle()
    const chatterId = mi?.id ?? null

    const [jAbierta, dAbierto, ventasHoyRows, ventasQRows, tareasRows, ventasSerieRows] = await Promise.all([
      admin.from('jornadas').select('id').eq('user_id', user!.id).is('fin', null).limit(1),
      admin.from('descansos').select('id').eq('user_id', user!.id).is('fin', null).limit(1),
      chatterId ? admin.from('ventas').select('monto_bruto, estado').eq('chatter_id', chatterId).gte('fecha', inicioHoy) : Promise.resolve({ data: [] as { monto_bruto: number; estado: string }[] }),
      chatterId ? admin.from('ventas').select('monto_bruto, estado').eq('chatter_id', chatterId).gte('fecha', qStart).lt('fecha', qEnd) : Promise.resolve({ data: [] as { monto_bruto: number; estado: string }[] }),
      admin.from('tareas').select('id, titulo, fecha_limite').eq('asignado_a', user!.id).is('completada_at', null).order('fecha_limite', { ascending: true, nullsFirst: false }),
      chatterId ? admin.from('ventas').select('monto_bruto, estado, fecha').eq('chatter_id', chatterId).gte('fecha', hace40) : Promise.resolve({ data: [] as { monto_bruto: number; estado: string; fecha: string }[] }),
    ])

    const diasSerie: string[] = []
    for (let i = 39; i >= 0; i--) diasSerie.push(new Date(Date.UTC(hy, hm - 1, hd) - i * 86400000).toISOString().slice(0, 10))
    const bucketSerie = new Map<string, number>(diasSerie.map((f) => [f, 0]))
    for (const v of ventasSerieRows.data ?? []) {
      if ((v as { estado: string }).estado === 'Reverso') continue
      const f = fechaMadrid((v as { fecha: string }).fecha)
      if (bucketSerie.has(f)) bucketSerie.set(f, (bucketSerie.get(f) ?? 0) + Number((v as { monto_bruto: number }).monto_bruto ?? 0))
    }
    const serie = diasSerie.map((f) => ({ fecha: f, monto: bucketSerie.get(f) ?? 0 }))

    const sumar = (rows: { monto_bruto: number; estado: string }[] | null) =>
      (rows ?? []).filter((v) => v.estado !== 'Reverso').reduce((s, v) => s + Number(v.monto_bruto ?? 0), 0)

    const ventasQ = sumar(ventasQRows.data)
    const meta = mi?.meta_quincena != null ? Number(mi.meta_quincena) : null

    chatter = {
      enTurno: (jAbierta.data ?? []).length > 0,
      enBreak: (dAbierto.data ?? []).length > 0,
      meta,
      ventasQ,
      pct: meta && meta > 0 ? Math.round((ventasQ / meta) * 100) : null,
      falta: meta && meta > 0 ? Math.max(meta - ventasQ, 0) : null,
      ventasHoy: sumar(ventasHoyRows.data),
      tareasPend: (tareasRows.data ?? []).length,
      proxTarea: (tareasRows.data ?? [])[0]?.titulo ?? null,
      serie,
      quincenaLabel: qLabel,
      hoy: hoyMadrid,
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{today}</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Bienvenido{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Accediendo como{' '}
          <span style={{ color: 'var(--gold)' }} className="font-medium">{ROLE_LABELS[role]}</span>
        </p>
      </div>

      {/* ── DASHBOARD STAFF (admin / manager / team_leader) ── */}
      {staff && (
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<Users size={14} />} label="En línea ahora" tone="green"
              value={String(staff.online.filter((o) => !o.enBreak).length)}
              sub={`${staff.online.filter((o) => o.enBreak).length} en break`} />
            <Kpi icon={<DollarSign size={14} />} label="Ventas de hoy" tone="gold"
              value={money(staff.ventasHoy)}
              subColor={(() => {
                const d = staff.ventasHoy - staff.ventasAyer
                return d > 0 ? '#4ADE80' : d < 0 ? '#F87171' : 'rgba(107,107,128,0.7)'
              })()}
              sub={(() => {
                const d = staff.ventasHoy - staff.ventasAyer
                const pct = staff.ventasAyer > 0 ? Math.round((d / staff.ventasAyer) * 100) : null
                const flecha = d > 0 ? '▲' : d < 0 ? '▼' : '='
                return `${flecha} ${money(Math.abs(d))}${pct != null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''} vs ayer`
              })()} />
            <Kpi icon={<CheckSquare size={14} />} label="Tareas pendientes"
              value={String(staff.tareasPend)} />
            <Kpi icon={<Target size={14} />} label="Meta quincena (prom.)"
              value={staff.metaPct != null ? `${staff.metaPct}%` : '—'}
              sub={`${staff.metaChatters} chatters con meta`}
              tone={staff.metaPct != null && staff.metaPct >= 100 ? 'green' : 'default'} />
          </div>

          {panelCharts && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} style={{ color: 'var(--gold)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Seguidores de la agencia</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Marketing · todas las cuentas propias</p>
                  </div>
                </div>
                <SerieChart serie={panelCharts.serieSeguidores} hoy={panelCharts.hoy} formato="numero" gradId="segAgencia" />
              </div>
              <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={16} style={{ color: 'var(--gold)' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Facturación de la agencia</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Suscripciones + ventas · Infloww</p>
                  </div>
                </div>
                <SerieChart serie={panelCharts.serieVentas} hoy={panelCharts.hoy} formato="money" gradId="ventasAgencia" />
              </div>
            </div>
          )}

          {/* En turno ahora según horario: esperados vs fichados */}
          {staff.turnoAhora.esperados > 0 && (
            <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>En turno ahora (según horario)</p>
                <p className="text-sm font-bold" style={{ color: staff.turnoAhora.presentes >= staff.turnoAhora.esperados ? '#4ADE80' : '#EAB308' }}>
                  {staff.turnoAhora.presentes}/{staff.turnoAhora.esperados} fichados
                </p>
              </div>
              {staff.turnoAhora.faltan.length > 0 ? (
                <div>
                  <p className="text-[11px] mb-1.5" style={{ color: 'var(--muted)' }}>Deberían estar y no han fichado:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {staff.turnoAhora.faltan.map((f, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-lg"
                        style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                        {f.nombre}{f.equipo ? ` · E${f.equipo}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs" style={{ color: '#4ADE80' }}>Todos los que tienen turno ahora están fichados ✓</p>
              )}
            </div>
          )}

          {/* Cumplimiento de hoy (basado en fichaje) */}
          {(staff.alertas.length > 0 || staff.sinFichar.length > 0 || staff.turnosLargos.length > 0) && (
            <div className="rounded-2xl border p-4" style={{ backgroundColor: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.25)' }}>
              <div className="flex items-center gap-2 mb-3" style={{ color: '#F87171' }}>
                <AlertTriangle size={15} />
                <p className="text-xs font-semibold uppercase tracking-wider">Cumplimiento de hoy</p>
              </div>
              <div className="space-y-3">
                {staff.sinFichar.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Sin fichar hoy</p>
                    <p className="text-sm" style={{ color: 'var(--foreground)' }}>{staff.sinFichar.join(' · ')}</p>
                  </div>
                )}
                {staff.alertas.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Breaks largos (+30 min)</p>
                    <div className="space-y-1">
                      {staff.alertas.map((a, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--foreground)' }}>{a.nombre}</span>
                          <span style={{ color: '#F87171' }}>{a.min} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {staff.turnosLargos.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Turno abierto +10h (¿sin cerrar?)</p>
                    <div className="space-y-1">
                      {staff.turnosLargos.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--foreground)' }}>{t.nombre}</span>
                          <span style={{ color: '#EAB308' }}>{t.horas} h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ranking del día */}
          {staff.ranking.length > 0 && (
            <div>
              <SectionTitle>Ranking del día · ventas</SectionTitle>
              <div className="rounded-2xl border divide-y" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                {staff.ranking.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold w-5 text-center" style={{ color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>{i + 1}</span>
                      <span className="text-sm" style={{ color: 'var(--foreground)' }}>{r.nombre}</span>
                      {i === 0 && <span className="text-xs">🏆</span>}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>{money(r.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* En línea ahora */}
            <div>
              <SectionTitle>En línea ahora · {staff.online.length}</SectionTitle>
              <div className="rounded-2xl border divide-y" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderTopColor: 'var(--border)' }}>
                {staff.online.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>Nadie en turno ahora mismo.</p>
                ) : staff.online.map((o, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      {o.enBreak
                        ? <Coffee size={14} style={{ color: '#EAB308' }} />
                        : <Circle size={9} fill="#4ADE80" style={{ color: '#4ADE80' }} />}
                      <span className="text-sm" style={{ color: 'var(--foreground)' }}>{o.nombre}</span>
                    </div>
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <Clock size={11} /> {minutosDesde(o.desde)} min · {o.enBreak ? 'en break' : 'en turno'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Novedades del turno */}
            <div>
              <SectionTitle>Últimas novedades del turno</SectionTitle>
              <div className="rounded-2xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                {staff.novedades.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>Sin novedades recientes.</p>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {staff.novedades.map((n, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <ClipboardList size={13} style={{ color: 'var(--gold)', marginTop: 2 }} />
                          <div className="min-w-0">
                            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{n.texto}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                              {n.equipo ? `Equipo ${n.equipo} · ` : ''}
                              {new Date(n.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DASHBOARD CHATTER ── */}
      {chatter && (
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              icon={<Circle size={12} fill={chatter.enTurno ? (chatter.enBreak ? '#EAB308' : '#4ADE80') : 'var(--muted)'} style={{ color: chatter.enTurno ? (chatter.enBreak ? '#EAB308' : '#4ADE80') : 'var(--muted)' }} />}
              label="Tu turno"
              value={chatter.enTurno ? (chatter.enBreak ? 'En break' : 'En turno') : 'Fuera'}
              tone={chatter.enTurno && !chatter.enBreak ? 'green' : 'default'} />
            <Kpi icon={<DollarSign size={14} />} label="Tus ventas hoy" tone="gold" value={money(chatter.ventasHoy)} />
            <Kpi icon={<Target size={14} />} label="Tu meta quincena"
              value={chatter.pct != null ? `${chatter.pct}%` : '—'}
              sub={chatter.meta != null ? `${money(chatter.ventasQ)} de ${money(chatter.meta)}` : 'Sin meta asignada'}
              tone={chatter.pct != null && chatter.pct >= 100 ? 'green' : 'gold'} />
            <Kpi icon={<CheckSquare size={14} />} label="Tareas pendientes"
              value={String(chatter.tareasPend)}
              sub={chatter.proxTarea ?? undefined} />
          </div>

          <VentasChart serie={chatter.serie} meta={chatter.meta} metaVendido={chatter.ventasQ} quincenaLabel={chatter.quincenaLabel} hoy={chatter.hoy} />
        </div>
      )}

      {/* Botones de acceso rápido — solo para modelos */}
      {role === 'modelo' && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Acceso rápido</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile?.content_snare_url ? (
              <a href={profile.content_snare_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:opacity-90 active:scale-[0.98] group"
                style={{ backgroundColor: 'rgba(201,168,76,0.08)', borderColor: 'var(--gold-25)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--gold-15)' }}>
                  <FileText size={18} style={{ color: 'var(--gold)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--gold)' }}>Plantilla OF</p>
                  <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>Content Snare</p>
                </div>
                <ExternalLink size={14} style={{ color: 'var(--gold)' }} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl border opacity-40 cursor-default" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--border)' }}>
                  <FileText size={18} style={{ color: 'var(--muted)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--muted)' }}>Plantilla OF</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Pendiente de configurar</p>
                </div>
              </div>
            )}

            {profile?.notion_url ? (
              <a href={profile.notion_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:opacity-90 active:scale-[0.98] group"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--border)' }}>
                  <ListTodo size={18} style={{ color: 'var(--foreground)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>TO-DO Marketing</p>
                  <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>Notion</p>
                </div>
                <ExternalLink size={14} style={{ color: 'var(--muted)' }} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl border opacity-40 cursor-default" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--border)' }}>
                  <ListTodo size={18} style={{ color: 'var(--muted)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--muted)' }}>TO-DO Marketing</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Pendiente de configurar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modules grid — solo para roles sin panel propio (VA, creativa). Staff/chatter/modelo usan el menú lateral. */}
      {!staff && !chatter && role !== 'modelo' && modules.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Módulos</h2>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {modules.filter((m) => m.isBuilt).length} activos ·{' '}
              {modules.filter((m) => !m.isBuilt).length} próximamente
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((mod) => (
              <ModuleCard key={mod.id} module={mod} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
