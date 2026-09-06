import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import GestionUsuarios from '@/components/usuarios/GestionUsuarios'
import { Users } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Usuarios — Skeilab' }

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const miRole = me?.role as UserRole
  if (!['admin', 'manager', 'team_leader'].includes(miRole)) redirect('/')

  const esTeamLeader = miRole === 'team_leader'
  const sp = await searchParams
  const rolInicial = sp?.nuevo === 'modelo' ? 'modelo' : 'chatter'
  const modoModelo = sp?.nuevo === 'modelo'

  // Perfiles + emails/estado desde auth
  const [{ data: profiles }, authList] = await Promise.all([
    admin.from('profiles').select('id, full_name, role, created_at').order('full_name'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const authMap = new Map(
    (authList?.data?.users ?? []).map((u) => [
      u.id,
      { email: u.email ?? '', banned: !!(u as { banned_until?: string }).banned_until },
    ])
  )

  let usuarios = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role as string,
    email: authMap.get(p.id)?.email ?? '',
    activo: !(authMap.get(p.id)?.banned ?? false),
  }))

  // El team leader solo ve chatters en la lista
  if (esTeamLeader) usuarios = usuarios.filter((u) => u.role === 'chatter')
  else if (modoModelo) usuarios = usuarios.filter((u) => u.role === 'modelo')
  else usuarios = usuarios.filter((u) => u.role !== 'modelo')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-15)' }}>
          <Users size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            {esTeamLeader ? 'Chatters' : modoModelo ? 'Modelos' : 'Usuarios'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {esTeamLeader
              ? 'Da de alta chatters de tu equipo — se crean con contraseña temporal'
              : 'Crea cuentas, asigna roles y activa o elimina — sin tocar la base de datos'}
          </p>
        </div>
      </div>

      <GestionUsuarios usuarios={usuarios} miId={user.id} miRole={miRole} rolInicial={rolInicial} modoModelo={modoModelo} key={rolInicial} />
    </div>
  )
}
