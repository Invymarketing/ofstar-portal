import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Tareas from '@/components/modulo-14/Tareas'
import { CheckSquare } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Tareas — OF Star Management' }

export default async function Modulo14Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  const esStaff = ['admin', 'manager', 'team_leader'].includes(role)

  // Personas para asignar (solo staff necesita la lista)
  const { data: personas } = esStaff
    ? await admin.from('profiles').select('id, full_name, role').order('full_name')
    : { data: [] }

  // Tareas: staff ve todas; el resto solo las suyas
  let query = admin.from('tareas')
    .select('id, titulo, descripcion, asignado_a, asignado_por, estado, fecha_limite, completada_at, created_at')
    .order('created_at', { ascending: false }).limit(200)
  if (!esStaff) query = query.eq('asignado_a', user.id)
  const { data: tareas, error } = await query

  const tablesReady = !error
  const nombreDe = new Map((personas ?? []).map((p) => [p.id, p.full_name]))
  const tareasView = (tareas ?? []).map((t) => ({
    ...t,
    asignado_nombre: nombreDe.get(t.asignado_a) ?? null,
    mia: t.asignado_a === user.id,
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <CheckSquare size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Tareas</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
            {esStaff ? 'Asigna tareas y sigue su cumplimiento' : 'Tus tareas asignadas'}
          </p>
        </div>
      </div>

      {!tablesReady ? (
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'rgba(234,179,8,0.05)', borderColor: 'rgba(234,179,8,0.2)' }}>
          <p className="text-sm" style={{ color: '#EAB308' }}>Migración pendiente</p>
          <p className="text-xs mt-1" style={{ color: '#6B6B80' }}>Ejecuta 016_tareas.sql en Supabase.</p>
        </div>
      ) : (
        <Tareas
          esStaff={esStaff}
          personas={(personas ?? []).map((p) => ({ id: p.id, full_name: p.full_name, role: p.role }))}
          tareas={tareasView}
        />
      )}
    </div>
  )
}
