import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const EDITORES = ['admin', 'manager', 'team_leader', 'creativo', 'marketing_manager', 'director_creativo']
const VISORES = ['chatter', 'content_manager', 'va']

// Campos de texto compartidos entre Identidad y Fichas de Modelo (los precios NO están aquí)
const CAMPOS_TEXTO = [
  'nombre_artistico', 'nombre_real', 'nacionalidad', 'ubicacion_ficticia', 'idioma', 'zona_horaria',
  'personalidad', 'energia', 'enfoque', 'tono', 'temas_gusta', 'limites', 'palabras_evitar', 'descripcion',
  'instagram', 'telegram', 'twitter', 'otros_enlaces', 'notas',
]

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

  const { data: f } = await c.admin.from('fichas_modelo').select('*').eq('modelo_id', id).maybeSingle()

  const out: Record<string, unknown> = {
    editable: puedeEditar,
    edad_real: f?.edad_real ?? '',
    edad_ficticia: f?.edad_ficticia ?? '',
  }
  for (const k of CAMPOS_TEXTO) out[k] = (f as any)?.[k] ?? ''
  return NextResponse.json(out)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx(); if (!c) return NextResponse.json({ error: 'no' }, { status: 403 })
  if (!EDITORES.includes(c.role)) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const b = await req.json()
  const s = (v: any) => (v == null ? null : (String(v).trim() || null))

  // Solo tocamos los campos que vengan en la petición (no pisamos el resto: precios, etc.)
  const patch: Record<string, unknown> = { modelo_id: id, updated_by: c.uid, updated_at: new Date().toISOString() }
  for (const k of CAMPOS_TEXTO) if (k in b) patch[k] = s(b[k])
  if ('edad_real' in b) patch.edad_real = b.edad_real ? Number(b.edad_real) : null
  if ('edad_ficticia' in b) patch.edad_ficticia = b.edad_ficticia ? Number(b.edad_ficticia) : null

  const { error } = await c.admin.from('fichas_modelo').upsert(patch, { onConflict: 'modelo_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
