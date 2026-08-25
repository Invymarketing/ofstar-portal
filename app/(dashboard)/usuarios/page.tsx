import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import GestionUsuarios from '@/components/usuarios/GestionUsuarios'
import { Users } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Usuarios — OF Star Management' }

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if ((me?.role as UserRole) !== 'admin') redirect('/')

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

  const usuarios = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role as string,
    email: authMap.get(p.id)?.email ?? '',
    activo: !(authMap.get(p.id)?.banned ?? false),
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <Users size={18} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>Empleados</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6B6B80' }}>
            Crea cuentas, asigna roles y activa o elimina — sin tocar la base de datos
          </p>
        </div>
      </div>

      <GestionUsuarios usuarios={usuarios} miId={user.id} />
    </div>
  )
}
