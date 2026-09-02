import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MetasPanel from '@/components/modulo-16/MetasPanel'
import { Target } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Metas & Productividad — OF Star Management' }

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

export default async function Modulo16Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  if (!['admin', 'manager', 'team_leader'].includes(role)) redirect('/')

  const { start, end, label } = quincena()

  const [{ data: chatters }, { data: ventas }, { data: jornadas }, { data: descansos }] = await Promise.all([
    admin.from('chatters').select('id, nombre, profile_id, meta_quincena, activo').eq('activo', true).order('nombre'),
    admin.from('ventas').select('chatter_id, monto_bruto, estado, fecha').gte('fecha', start).lt('fecha', end),
    admin.from('jornadas').select('user_id, inicio, fin').gte('inicio', start).lt('inicio', end),
    admin.from('descansos').select('user_id, inicio, fin').gte('inicio', start).lt('inicio', end),
  ])

  const now = Date.now()
  const dur = (a: string, b: string | null) => (b ? +new Date(b) : now) - +new Date(a)

  // Ventas por chatter (bruto, sin reversos)
  const ventasPorChatter = new Map<string, number>()
  for (const v of ventas ?? []) {
    if (v.estado === 'Reverso' || !v.chatter_id) continue
    ventasPorChatter.set(v.chatter_id, (ventasPorChatter.get(v.chatter_id) ?? 0) + Number(v.monto_bruto ?? 0))
  }
  // Horas por profile (bruto - break)
  const brutoPorUser = new Map<string, number>()
  const breakPorUser = new Map<string, number>()
  for (const j of jornadas ?? []) brutoPorUser.set(j.user_id, (brutoPorUser.get(j.user_id) ?? 0) + dur(j.inicio, j.fin))
  for (const d of descansos ?? []) breakPorUser.set(d.user_id, (breakPorUser.get(d.user_id) ?? 0) + dur(d.inicio, d.fin))

  const filas = (chatters ?? []).map((c) => {
    const ventasC = ventasPorChatter.get(c.id) ?? 0
    const meta = c.meta_quincena != null ? Number(c.meta_quincena) : null
    const horasMs = Math.max((brutoPorUser.get(c.profile_id ?? '') ?? 0) - (breakPorUser.get(c.profile_id ?? '') ?? 0), 0)
    const horas = horasMs / 3600000
    return {
      chatter_id: c.id,
      nombre: c.nombre,
      meta,
      ventas: ventasC,
      pct: meta && meta > 0 ? Math.round((ventasC / meta) * 100) : null,
      falta: meta && meta > 0 ? Math.max(meta - ventasC, 0) : null,
      horas: Math.round(horas * 10) / 10,
      por_hora: horas > 0 ? ventasC / horas : null,
    }
  }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.ventas - a.ventas)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <Target size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Metas & Productividad</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>Avance de meta y rendimiento por chatter · quincena {label}</p>
        </div>
      </div>

      <MetasPanel filas={filas} />
    </div>
  )
}
