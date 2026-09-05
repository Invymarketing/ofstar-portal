import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FichasModelo, { type Ficha } from '@/components/modulo-21/FichasModelo'
import { BookUser } from 'lucide-react'
import type { UserRole } from '@/types'

export const metadata = { title: 'Fichas de Modelo — Skeilab' }

export default async function Modulo21Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role as UserRole
  const esEditor = ['admin', 'manager'].includes(role)

  const { data: modelos } = await admin.from('modelos').select('id, model_name, activa').order('model_name')
  const activas = (modelos ?? []).filter((m) => m.activa !== false).map((m) => ({ id: m.id, model_name: m.model_name }))

  const { data: fichas } = await admin.from('fichas_modelo').select('*')

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--border)' }}>
          <BookUser size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Fichas de Modelo</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Toda la info de cada modelo para trabajar: datos, tono, precios y redes.
            {!esEditor && ' (solo consulta)'}
          </p>
        </div>
      </div>

      <FichasModelo modelos={activas} fichas={(fichas ?? []) as Ficha[]} esEditor={esEditor} />
    </div>
  )
}
