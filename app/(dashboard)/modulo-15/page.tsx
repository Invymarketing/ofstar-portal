import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Fichaje from '@/components/modulo-15/Fichaje'
import { Timer } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Fichaje — OF Star Management' }

export default async function Modulo15Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  const esStaff = ['admin', 'manager', 'team_leader'].includes(role)

  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

  let jq = admin.from('jornadas').select('id, user_id, inicio, fin').or(`fin.is.null,inicio.gte.${desde}`)
  let dq = admin.from('descansos').select('id, jornada_id, user_id, inicio, fin').or(`fin.is.null,inicio.gte.${desde}`)
  if (!esStaff) { jq = jq.eq('user_id', user.id); dq = dq.eq('user_id', user.id) }

  const [{ data: jornadas }, { data: descansos }, personasRes, { data: handoffs }] = await Promise.all([
    jq, dq,
    esStaff ? admin.from('profiles').select('id, full_name, role') : Promise.resolve({ data: [] as { id: string; full_name: string; role: string }[] }),
    admin.from('handoffs').select('id, user_id, texto, equipo, created_at').order('created_at', { ascending: false }).limit(40),
  ])

  // Equipo del usuario actual (para filtrar sus novedades)
  const { data: miChatter } = await admin.from('chatters').select('equipo').eq('profile_id', user.id).maybeSingle()
  const miEquipo = miChatter?.equipo ?? null

  // Nombres de los autores de las novedades
  const autorIds = [...new Set((handoffs ?? []).map((h) => h.user_id).filter(Boolean))] as string[]
  const { data: autores } = autorIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', autorIds)
    : { data: [] as { id: string; full_name: string }[] }
  const autorMap = new Map((autores ?? []).map((a) => [a.id, a.full_name]))
  const handoffsView = (handoffs ?? []).map((h) => ({
    id: h.id, texto: h.texto, created_at: h.created_at, equipo: h.equipo ?? null,
    autor: h.user_id ? (autorMap.get(h.user_id) ?? '—') : '—',
  }))

  const misJornadas = (jornadas ?? []).filter((j) => j.user_id === user.id)
  const misDescansos = (descansos ?? []).filter((d) => d.user_id === user.id)
  const jornadaAbierta = misJornadas.find((j) => !j.fin) ?? null
  const breakAbierto = jornadaAbierta ? misDescansos.find((d) => d.jornada_id === jornadaAbierta.id && !d.fin) ?? null : null

  const estado = {
    enTurno: !!jornadaAbierta,
    enBreak: !!breakAbierto,
    inicioTurno: jornadaAbierta?.inicio ?? null,
    inicioBreak: breakAbierto?.inicio ?? null,
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <Timer size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Fichaje</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>Marca tu turno y tus breaks · control de tiempo</p>
        </div>
      </div>

      <Fichaje
        estado={estado}
        misJornadas={misJornadas.map((j) => ({ inicio: j.inicio, fin: j.fin }))}
        misDescansos={misDescansos.map((d) => ({ inicio: d.inicio, fin: d.fin }))}
        esStaff={esStaff}
        jornadas={(jornadas ?? []).map((j) => ({ user_id: j.user_id, inicio: j.inicio, fin: j.fin }))}
        descansos={(descansos ?? []).map((d) => ({ user_id: d.user_id, inicio: d.inicio, fin: d.fin }))}
        personas={(personasRes.data ?? []).map((p) => ({ id: p.id, full_name: p.full_name, role: p.role }))}
        handoffs={handoffsView}
        miEquipo={miEquipo}
      />
    </div>
  )
}
