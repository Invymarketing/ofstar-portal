import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Espanolizador from '@/components/modulo-20/Espanolizador'
import { Languages } from 'lucide-react'

export const metadata = { title: 'Españolizador — Skeilab' }

export default async function Modulo20Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--border)' }}>
          <Languages size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Españolizador</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Convierte cualquier texto latino a español de España, castizo y juvenil.
          </p>
        </div>
      </div>

      <Espanolizador />
    </div>
  )
}
