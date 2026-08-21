// app/api/modelos/[id]/onlyfans/route.ts
// Conteo de contenido de VENTA OnlyFans (Content Snare) para una modelo.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { contenidoOnlyFans } from '@/lib/content-snare'

export const maxDuration = 60

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager', 'creativo'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'sin_permiso' }, { status: 403 })
  }

  const { data: modelo } = await admin
    .from('modelos').select('id, content_snare_url').eq('id', id).single()
  if (!modelo) return NextResponse.json({ error: 'modelo_no_encontrada' }, { status: 404 })

  const acc = modelo.content_snare_url
  if (!acc) return NextResponse.json({ ok: true, encontrado: false, motivo: 'sin_enlace' })

  try {
    const r = await contenidoOnlyFans(acc)
    return NextResponse.json({ ok: true, ...r })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message?.slice(0, 200) ?? 'fallo' }, { status: 500 })
  }
}
