import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(p?.role ?? '')) return null
  return { admin, uid: user.id }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const [{ data: tareas }, { data: todos }] = await Promise.all([
    g.admin.from('modelo_tareas').select('id, dia_semana, titulo').eq('modelo_id', id).not('dia_semana', 'is', null).order('dia_semana').order('created_at'),
    g.admin.from('modelo_todos').select('id, texto, hecho, hecho_at').eq('modelo_id', id).order('created_at'),
  ])
  return NextResponse.json({ tareas: tareas ?? [], todos: todos ?? [] })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const b = await req.json()
  const t = g.admin
  const dia = Number(b.dia)
  if (b.op === 'add') {
    if (!(dia >= 0 && dia <= 6)) return NextResponse.json({ error: 'dia' }, { status: 400 })
    const titulo = String(b.titulo || '').trim()
    if (titulo) await t.from('modelo_tareas').insert({ modelo_id: id, dia_semana: dia, titulo, created_by: g.uid })
  }
  else if (b.op === 'move') await t.from('modelo_tareas').update({ dia_semana: dia }).eq('id', b.tareaId).eq('modelo_id', id)
  else if (b.op === 'del') await t.from('modelo_tareas').delete().eq('id', b.tareaId).eq('modelo_id', id)
  else if (b.op === 'todoAdd') {
    const texto = String(b.texto || '').trim()
    if (texto) await t.from('modelo_todos').insert({ modelo_id: id, texto, created_by: g.uid })
  }
  else if (b.op === 'todoToggle') await t.from('modelo_todos').update({ hecho: !!b.hecho, hecho_at: b.hecho ? new Date().toISOString() : null }).eq('id', b.todoId).eq('modelo_id', id)
  else if (b.op === 'todoDel') await t.from('modelo_todos').delete().eq('id', b.todoId).eq('modelo_id', id)
  return NextResponse.json({ ok: true })
}
