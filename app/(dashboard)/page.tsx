import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAccessibleModules } from '@/lib/modules'
import { ROLE_LABELS } from '@/lib/roles'
import ModuleCard from '@/components/ui/ModuleCard'
import {
  ExternalLink, FileText, ListTodo, Users, DollarSign, CheckSquare,
  Target, AlertTriangle, Circle, Coffee, Clock, ClipboardList,
} from 'lucide-react'
import type { UserRole } from '@/types'

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

function inicioHoyISO() {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function minutosDesde(iso: string) {
  return Math.floor((Date.now() - +new Date(iso)) / 60000)
}

// ── Tarjeta KPI ──────────────────────────────────────────────
function Kpi({ icon, label, value, sub, tone = 'default' }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'default' | 'gold' | 'green' | 'red'
}) {
  const color = tone === 'gold' ? '#C9A84C' : tone === 'green' ? '#4ADE80' : tone === 'red' ? '#F87171' : '#F0F0F5'
  return (
    <div className="rounded-xl px-4 py-4" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: '#6B6B80' }}>
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: 'rgba(107,107,128,0.7)' }}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B6B80' }}>{children}</h2>
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
  const esChatter = role === 'chatter'

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Datos del dashboard STAFF ──────────────────────────────
  let staff: null | {
    online: { nombre: string; enBreak: boolean; desde: string }[]
    ventasHoy: number
    tareasPend: number
    metaPct: number | null
    metaChatters: number
    alertas: { nombre: string; min: number }[]
    novedades: { texto: string; created_at: string; equipo: number | null }[]
  } = null

  if (esStaff) {
    const inicioHoy = inicioHoyISO()
    const { start: qStart, end: qEnd } = quincena()

    const [jAbiertas, dAbiertos, ventasHoyRows, tareasPendRows, chattersAct, ventasQ, handoffs, personas] = await Promise.all([
      admin.from('jornadas').select('user_id, inicio').is('fin', null),
      admin.from('descansos').select('user_id, inicio').is('fin', null),
      admin.from('ventas').select('monto_bruto, estado').gte('fecha', inicioHoy),
      admin.from('tareas').select('id').is('completada_at', null),
      admin.from('chatters').select('id, meta_quincena').eq('activo', true),
      admin.from('ventas').select('chatter_id, monto_bruto, estado').gte('fecha', qStart).lt('fecha', qEnd),
      admin.from('handoffs').select('texto, created_at, equipo').order('created_at', { ascending: false }).limit(4),
      admin.from('profiles').select('id, full_name'),
    ])

    const nombreDe = new Map((personas.data ?? []).map((p) => [p.id, p.full_name]))
    const enBreakSet = new Set((dAbiertos.data ?? []).map((d) => d.user_id))
    const breakDesde = new Map((dAbiertos.data ?? []).map((d) => [d.user_id, d.inicio]))

    const online = (jAbiertas.data ?? []).map((j) => ({
      nombre: nombreDe.get(j.user_id) ?? '—',
      enBreak: enBreakSet.has(j.user_id),
      desde: j.inicio,
    })).sort((a, b) => Number(a.enBreak) - Number(b.enBreak))

    const ventasHoy = (ventasHoyRows.data ?? [])
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

    // Alertas: breaks abiertos de más de 30 min
    const alertas = (dAbiertos.data ?? [])
      .map((d) => ({ nombre: nombreDe.get(d.user_id) ?? '—', min: minutosDesde(d.inicio) }))
      .filter((a) => a.min >= 30)
      .sort((a, b) => b.min - a.min)

    staff = {
      online,
      ventasHoy,
      tareasPend: (tareasPendRows.data ?? []).length,
      metaPct,
      metaChatters: conMeta.length,
      alertas,
      novedades: (handoffs.data ?? []).map((h) => ({ texto: h.texto, created_at: h.created_at, equipo: h.equipo ?? null })),
    }
  }

  // ── Datos del dashboard CHATTER ────────────────────────────
  let chatter: null | {
    enTurno: boolean; enBreak: boolean
    meta: number | null; ventasQ: number; pct: number | null; falta: number | null
    ventasHoy: number; tareasPend: number; proxTarea: string | null
  } = null

  if (esChatter) {
    const inicioHoy = inicioHoyISO()
    const { start: qStart, end: qEnd } = quincena()

    const { data: mi } = await admin.from('chatters').select('id, meta_quincena').eq('profile_id', user!.id).maybeSingle()
    const chatterId = mi?.id ?? null

    const [jAbierta, dAbierto, ventasHoyRows, ventasQRows, tareasRows] = await Promise.all([
      admin.from('jornadas').select('id').eq('user_id', user!.id).is('fin', null).limit(1),
      admin.from('descansos').select('id').eq('user_id', user!.id).is('fin', null).limit(1),
      chatterId ? admin.from('ventas').select('monto_bruto, estado').eq('chatter_id', chatterId).gte('fecha', inicioHoy) : Promise.resolve({ data: [] as { monto_bruto: number; estado: string }[] }),
      chatterId ? admin.from('ventas').select('monto_bruto, estado').eq('chatter_id', chatterId).gte('fecha', qStart).lt('fecha', qEnd) : Promise.resolve({ data: [] as { monto_bruto: number; estado: string }[] }),
      admin.from('tareas').select('id, titulo, fecha_limite').eq('asignado_a', user!.id).is('completada_at', null).order('fecha_limite', { ascending: true, nullsFirst: false }),
    ])

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
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: '#6B6B80' }}>{today}</p>
        <h1 className="text-2xl font-bold" style={{ color: '#F0F0F5' }}>
          Bienvenida{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6B6B80' }}>
          Accediendo como{' '}
          <span style={{ color: '#C9A84C' }} className="font-medium">{ROLE_LABELS[role]}</span>
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
              value={money(staff.ventasHoy)} />
            <Kpi icon={<CheckSquare size={14} />} label="Tareas pendientes"
              value={String(staff.tareasPend)} />
            <Kpi icon={<Target size={14} />} label="Meta quincena (prom.)"
              value={staff.metaPct != null ? `${staff.metaPct}%` : '—'}
              sub={`${staff.metaChatters} chatters con meta`}
              tone={staff.metaPct != null && staff.metaPct >= 100 ? 'green' : 'default'} />
          </div>

          {/* Alertas */}
          {staff.alertas.length > 0 && (
            <div className="rounded-2xl border p-4" style={{ backgroundColor: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.25)' }}>
              <div className="flex items-center gap-2 mb-3" style={{ color: '#F87171' }}>
                <AlertTriangle size={15} />
                <p className="text-xs font-semibold uppercase tracking-wider">Alertas · breaks largos</p>
              </div>
              <div className="space-y-1.5">
                {staff.alertas.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span style={{ color: '#F0F0F5' }}>{a.nombre}</span>
                    <span style={{ color: '#F87171' }}>{a.min} min en break</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* En línea ahora */}
            <div>
              <SectionTitle>En línea ahora · {staff.online.length}</SectionTitle>
              <div className="rounded-2xl border divide-y" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E', borderTopColor: '#1E1E2E' }}>
                {staff.online.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: '#6B6B80' }}>Nadie en turno ahora mismo.</p>
                ) : staff.online.map((o, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderColor: '#1E1E2E' }}>
                    <div className="flex items-center gap-2.5">
                      {o.enBreak
                        ? <Coffee size={14} style={{ color: '#EAB308' }} />
                        : <Circle size={9} fill="#4ADE80" style={{ color: '#4ADE80' }} />}
                      <span className="text-sm" style={{ color: '#F0F0F5' }}>{o.nombre}</span>
                    </div>
                    <span className="text-xs flex items-center gap-1" style={{ color: '#6B6B80' }}>
                      <Clock size={11} /> {minutosDesde(o.desde)} min · {o.enBreak ? 'en break' : 'en turno'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Novedades del turno */}
            <div>
              <SectionTitle>Últimas novedades del turno</SectionTitle>
              <div className="rounded-2xl border" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
                {staff.novedades.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: '#6B6B80' }}>Sin novedades recientes.</p>
                ) : (
                  <div className="divide-y" style={{ borderColor: '#1E1E2E' }}>
                    {staff.novedades.map((n, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <ClipboardList size={13} style={{ color: '#C9A84C', marginTop: 2 }} />
                          <div className="min-w-0">
                            <p className="text-sm" style={{ color: '#F0F0F5' }}>{n.texto}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: '#6B6B80' }}>
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
              icon={<Circle size={12} fill={chatter.enTurno ? (chatter.enBreak ? '#EAB308' : '#4ADE80') : '#6B6B80'} style={{ color: chatter.enTurno ? (chatter.enBreak ? '#EAB308' : '#4ADE80') : '#6B6B80' }} />}
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

          {chatter.meta != null && chatter.falta != null && (
            <div className="rounded-2xl border p-5" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: '#F0F0F5' }}>Avance de tu meta</p>
                <p className="text-sm font-bold" style={{ color: chatter.pct! >= 100 ? '#4ADE80' : '#C9A84C' }}>{chatter.pct}%</p>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1E1E2E' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(chatter.pct!, 100)}%`, backgroundColor: chatter.pct! >= 100 ? '#4ADE80' : '#C9A84C' }} />
              </div>
              <p className="text-xs mt-2" style={{ color: '#6B6B80' }}>
                {chatter.falta > 0 ? `Te faltan ${money(chatter.falta)} para tu meta.` : '¡Meta cumplida! 🎉'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botones de acceso rápido — solo para modelos */}
      {role === 'modelo' && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B6B80' }}>Acceso rápido</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile?.content_snare_url ? (
              <a href={profile.content_snare_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:opacity-90 active:scale-[0.98] group"
                style={{ backgroundColor: 'rgba(201,168,76,0.08)', borderColor: 'rgba(201,168,76,0.25)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(201,168,76,0.15)' }}>
                  <FileText size={18} style={{ color: '#C9A84C' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#C9A84C' }}>Plantilla OF</p>
                  <p className="text-xs truncate" style={{ color: '#6B6B80' }}>Content Snare</p>
                </div>
                <ExternalLink size={14} style={{ color: '#C9A84C' }} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl border opacity-40 cursor-default" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E1E2E' }}>
                  <FileText size={18} style={{ color: '#6B6B80' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#6B6B80' }}>Plantilla OF</p>
                  <p className="text-xs" style={{ color: '#6B6B80' }}>Pendiente de configurar</p>
                </div>
              </div>
            )}

            {profile?.notion_url ? (
              <a href={profile.notion_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:opacity-90 active:scale-[0.98] group"
                style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E1E2E' }}>
                  <ListTodo size={18} style={{ color: '#F0F0F5' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#F0F0F5' }}>TO-DO Marketing</p>
                  <p className="text-xs truncate" style={{ color: '#6B6B80' }}>Notion</p>
                </div>
                <ExternalLink size={14} style={{ color: '#6B6B80' }} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl border opacity-40 cursor-default" style={{ backgroundColor: '#13131A', borderColor: '#1E1E2E' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E1E2E' }}>
                  <ListTodo size={18} style={{ color: '#6B6B80' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#6B6B80' }}>TO-DO Marketing</p>
                  <p className="text-xs" style={{ color: '#6B6B80' }}>Pendiente de configurar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modules grid */}
      {modules.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: '#F0F0F5' }}>Módulos</h2>
            <span className="text-xs" style={{ color: '#6B6B80' }}>
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
