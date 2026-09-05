'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function guardarAudiencia(data: {
  cuenta_id: string
  semana_inicio: string
  paises: { pais: string; pct: number }[]
  genero_mujeres: number | null
  genero_hombres: number | null
  edades: Record<string, number>
  alcance: number | null
  impresiones: number | null
  visitas_perfil: number | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? ''
  if (!['admin', 'manager', 'va'].includes(role)) throw new Error('Sin permiso')

  const { error } = await admin.from('audiencia_semanal').upsert({
    cuenta_id: data.cuenta_id,
    semana_inicio: data.semana_inicio,
    registrado_por: user.id,
    paises: data.paises,
    genero_mujeres: data.genero_mujeres,
    genero_hombres: data.genero_hombres,
    edades: data.edades,
    alcance: data.alcance,
    impresiones: data.impresiones,
    visitas_perfil: data.visitas_perfil,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'cuenta_id,semana_inicio' })
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-19')
}
