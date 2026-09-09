import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const EDITORES = ['admin', 'manager', 'team_leader', 'creativo', 'marketing_manager', 'director_creativo']
const VISORES = ['chatter', 'content_manager', 'va']

async function ctx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return { admin, uid: user.id, role: (p?.role ?? '') as string }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx(); if (!c) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const puedeEditar = EDITORES.includes(c.role)
  let ver = puedeEditar || VISORES.includes(c.role)
  if (!ver && c.role === 'modelo') {
    const { data: m } = await c.admin.from('modelos').select('id').eq('id', id).eq('user_id', c.uid).maybeSingle()
    ver = !!m
  }
  if (!ver) return NextResponse.json({ error: 'no' }, { status: 403 })

  const { data: m } = await c.admin.from('modelos').select('nicho_id, nacionalidad, energia, personalidad, enfoque, descripcion').eq('id', id).maybeSingle()

  let nicho: string | null = null
  if (m?.nicho_id) {
    const { data: n } = await c.admin.from('nichos').select('nombre').eq('id', m.nicho_id).maybeSingle()
    nicho = n?.nombre ?? null
  }

  return NextResponse.json({
    nicho,
    nacionalidad: m?.nacionalidad ?? '',
    energia: m?.energia ?? '',
    personalidad: m?.personalidad ?? '',
    enfoque: m?.enfoque ?? '',
    descripcion: m?.descripcion ?? '',
    editable: puedeEditar,
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx(); if (!c) return NextResponse.json({ error: 'no' }, { status: 403 })
  if (!EDITORES.includes(c.role)) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const b = await req.json()
  const s = (v: any) => (v == null ? null : (String(v).trim() || null))
  await c.admin.from('modelos').update({
    nacionalidad: s(b.nacionalidad),
    energia: s(b.energia),
    personalidad: s(b.personalidad),
    enfoque: s(b.enfoque),
    descripcion: s(b.descripcion),
  }).eq('id', id)
  return NextResponse.json({ ok: true })
}
