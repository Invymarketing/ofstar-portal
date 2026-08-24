import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Modulo4Tabs from '@/components/modulo-4/Modulo4Tabs'
import { MessageSquare, Info } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Control de Chatters — OF Star Management' }

// Quincena actual en hora España: "YYYY-MM-Q1" | "YYYY-MM-Q2"
function quincenaActual(): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const [y, m, d] = f.split('-')
  return `${y}-${m}` + (Number(d) <= 15 ? '-Q1' : '-Q2')
}

export default async function Modulo4Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single()

  const role = profile?.role as UserRole
  if (!['admin', 'manager', 'team_leader'].includes(role)) redirect('/')

  const quincena = quincenaActual()

  const [{ data: chatters }, { data: categorias }, { data: modelos }, { data: sanciones }, { data: errores }] =
    await Promise.all([
      admin.from('chatters').select('*').order('nombre'),
      admin.from('error_categorias').select('*').eq('activo', true).order('orden'),
      admin.from('modelos').select('id, model_name, activa').order('model_name'),
      admin.from('v_sanciones_quincena').select('*').eq('quincena', quincena),
      admin
        .from('chatter_errores')
        .select('id, modelo_id, fecha_error, descripcion, prueba_url, estado, chatter_id, categoria_id')
        .order('fecha_error', { ascending: false })
        .limit(50),
    ])

  // ¿La migración ya corrió?
  const tablesReady = chatters !== null && categorias !== null

  // Mapas para nombres
  const chatterMap = new Map((chatters ?? []).map((c) => [c.id, c.nombre]))
  const catMap = new Map((categorias ?? []).map((c) => [c.id, c]))
  const modeloMap = new Map((modelos ?? []).map((m) => [m.id, m.model_name]))

  // Ranking: cada chatter con su sanción de la quincena (los sin errores = limpios)
  const ranking = (chatters ?? [])
    .filter((c) => c.activo)
    .map((c) => {
      const s = (sanciones ?? []).find((x) => x.chatter_id === c.id)
      return {
        chatter_id: c.id,
        nombre: c.nombre,
        errores_totales: s?.errores_totales ?? 0,
        sancion_usd: s?.sancion_usd ?? 0,
        disparos: s?.disparos ?? 0,
        escalada: s?.escalada ?? '🟢 Limpio',
        puntaje: s?.puntaje ?? 100,
      }
    })
    .sort((a, b) => b.puntaje - a.puntaje)

  const erroresView = (errores ?? []).map((e) => ({
    ...e,
    modelo: e.modelo_id ? (modeloMap.get(e.modelo_id) ?? null) : null,
    chatter_nombre: chatterMap.get(e.chatter_id) ?? '—',
    categoria_nombre: catMap.get(e.categoria_id)?.nombre ?? '—',
    gravedad: catMap.get(e.categoria_id)?.grupo_gravedad ?? '',
  }))

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}
        >
          <MessageSquare size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Control de Chatters</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
            Registro de calidad y sanciones · quincena {quincena}
          </p>
        </div>
      </div>

      {/* Migración pendiente */}
      {!tablesReady && (
        <div
          className="rounded-2xl border p-5 mb-8 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}
        >
          <Info size={16} style={{ color: '#EAB308' }} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#EAB308' }}>Migración pendiente</p>
            <p className="text-xs" style={{ color: '#6B6B80' }}>
              Ejecuta <code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#1E1E2E' }}>supabase/migrations/004_chatters.sql</code> en Supabase para activar este módulo.
            </p>
          </div>
        </div>
      )}

      {tablesReady && (
        <Modulo4Tabs
          chatters={chatters ?? []}
          categorias={categorias ?? []}
          modelos={modelos ?? []}
          ranking={ranking}
          errores={erroresView}
        />
      )}
    </div>
  )
}
