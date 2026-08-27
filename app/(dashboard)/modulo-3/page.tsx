import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Modulo3Tabs from '@/components/modulo-3/Modulo3Tabs'
import { DollarSign, Info } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Caja, Ventas & Fans — OF Star Management' }

// Quincena actual en hora España: "YYYY-MM-Q1" | "YYYY-MM-Q2"
function quincenaActual(): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const [y, m, d] = f.split('-')
  return `${y}-${m}` + (Number(d) <= 15 ? '-Q1' : '-Q2')
}

export default async function Modulo3Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  if (!['admin', 'manager'].includes(role)) redirect('/')

  const quincena = quincenaActual()

  // Ventas de los últimos 35 días (suficiente para Hoy / Semana / Mes)
  const desde35 = new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString()

  const [{ data: modelos }, { data: ventas }, { data: fans }, { data: chatters }] = await Promise.all([
    admin.from('modelos').select('id, model_name, activa').order('model_name'),
    admin.from('ventas')
      .select('id, fecha, fan_name, fan_id, monto_bruto, comision, venta_neto, tipo, estado, origen, modelo_id, creator_id_infloww, creator_name, chatter_id')
      .gte('fecha', desde35)
      .order('fecha', { ascending: false })
      .limit(5000),
    admin.from('v_fans').select('*').order('ltv', { ascending: false }).limit(300),
    admin.from('chatters').select('id, nombre'),
  ])

  const tablesReady = ventas !== null && fans !== null
  const modeloMap = new Map((modelos ?? []).map((m) => [m.id, m.model_name]))
  const chatterMap = new Map((chatters ?? []).map((c) => [c.id, c.nombre]))

  const ventasView = (ventas ?? []).map((v) => ({
    ...v,
    monto_bruto: Number(v.monto_bruto ?? 0),
    comision: Number(v.comision ?? 0),
    venta_neto: Number(v.venta_neto ?? 0),
    modelo: v.modelo_id ? (modeloMap.get(v.modelo_id) ?? null) : null,
    chatter: v.chatter_id ? (chatterMap.get(v.chatter_id) ?? null) : null,
  }))

  const fansView = (fans ?? []).map((fn) => ({
    ...fn,
    modelo: fn.modelo_id ? (modeloMap.get(fn.modelo_id) ?? null) : null,
  }))

  // Creators de Infloww que llegaron SIN modelo mapeado (para asignarlos a mano)
  const sinMapearMap = new Map<string, { creator_id: string; creator_name: string | null; ventas: number; ejemplos: Set<string> }>()
  for (const v of ventas ?? []) {
    if (v.modelo_id || !v.creator_id_infloww) continue
    const key = String(v.creator_id_infloww)
    const cur = sinMapearMap.get(key) ?? { creator_id: key, creator_name: v.creator_name ?? null, ventas: 0, ejemplos: new Set<string>() }
    cur.ventas += 1
    if (!cur.creator_name && v.creator_name) cur.creator_name = v.creator_name
    if (v.fan_name && cur.ejemplos.size < 3) cur.ejemplos.add(v.fan_name)
    sinMapearMap.set(key, cur)
  }
  const sinMapear = [...sinMapearMap.values()]
    .map((c) => ({ creator_id: c.creator_id, creator_name: c.creator_name, ventas: c.ventas, ejemplos: [...c.ejemplos] }))
    .sort((a, b) => b.ventas - a.ventas)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <DollarSign size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Caja, Ventas & Fans</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
            Ventas de Infloww, comisiones y CRM de fans · quincena {quincena}
          </p>
        </div>
      </div>

      {!tablesReady && (
        <div className="rounded-2xl border p-5 mb-8 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}>
          <Info size={16} style={{ color: '#EAB308' }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#EAB308' }}>Migración pendiente</p>
            <p className="text-xs" style={{ color: '#6B6B80' }}>
              Ejecuta <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#1E1E2E' }}>supabase/migrations/006_ventas_fans.sql</code> en Supabase para activar este módulo.
            </p>
          </div>
        </div>
      )}

      {tablesReady && (
        <Modulo3Tabs
          modelos={(modelos ?? []).map((m) => ({ id: m.id, model_name: m.model_name, activa: m.activa }))}
          ventas={ventasView}
          fans={fansView}
          sinMapear={sinMapear}
        />
      )}
    </div>
  )
}
