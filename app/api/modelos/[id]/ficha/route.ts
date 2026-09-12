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

// Campos que viven en la tabla `modelos` (los usa el bot de Telegram/Drive), no en fichas_modelo.
// clave en el formulario -> columna en la tabla modelos
const CAMPOS_MODELO: Record<string, string> = {
  telegram_chat_id: 'telegram_group_id',
  drive_carpeta: 'drive_content_folder_id',
}

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
  const { data: mrow } = await c.admin.from('modelos')
    .select('telegram_group_id, drive_content_folder_id').eq('id', id).maybeSingle()

  const out: Record<string, unknown> = {
    editable: puedeEditar,
    edad_real: f?.edad_real ?? '',
    edad_ficticia: f?.edad_ficticia ?? '',
    telegram_chat_id: mrow?.telegram_group_id ?? '',
    drive_carpeta: mrow?.drive_content_folder_id ?? '',
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

  // Campos de la ficha (identidad). Solo tocamos los que vengan (no pisamos precios, etc.)
  const patch: Record<string, unknown> = { modelo_id: id, updated_by: c.uid, updated_at: new Date().toISOString() }
  for (const k of CAMPOS_TEXTO) if (k in b) patch[k] = s(b[k])
  if ('edad_real' in b) patch.edad_real = b.edad_real ? Number(b.edad_real) : null
  if ('edad_ficticia' in b) patch.edad_ficticia = b.edad_ficticia ? Number(b.edad_ficticia) : null

  const { error } = await c.admin.from('fichas_modelo').upsert(patch, { onConflict: 'modelo_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Casillas del bot: van a la tabla `modelos`.
  const mpatch: Record<string, unknown> = {}
  for (const [k, col] of Object.entries(CAMPOS_MODELO)) if (k in b) mpatch[col] = s(b[k])
  if (Object.keys(mpatch).length > 0) {
    const { error: mErr } = await c.admin.from('modelos').update(mpatch).eq('id', id)
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
