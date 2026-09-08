import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function ctx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return { admin, uid: user.id, role: (p?.role ?? '') as string }
}

async function puede(c: { admin: any; uid: string; role: string }, id: string): Promise<'edit' | 'modelo' | null> {
  if (['admin', 'manager'].includes(c.role)) return 'edit'
  if (c.role === 'modelo') {
    const { data: m } = await c.admin.from('modelos').select('id').eq('id', id).eq('user_id', c.uid).maybeSingle()
    if (m) return 'modelo'
  }
  return null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx(); if (!c) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const perm = await puede(c, id); if (!perm) return NextResponse.json({ error: 'no' }, { status: 403 })
  const [{ data: tareas }, { data: todos }, { data: ficha }] = await Promise.all([
    c.admin.from('modelo_tareas').select('id, dia_semana, titulo').eq('modelo_id', id).not('dia_semana', 'is', null).order('dia_semana').order('created_at'),
    c.admin.from('modelo_todos').select('id, texto, hecho, hecho_at, enlace_subir, enlace_guia').eq('modelo_id', id).order('created_at'),
    c.admin.from('modelos').select('limite_dia, limite_hora').eq('id', id).maybeSingle(),
  ])
  return NextResponse.json({
    tareas: tareas ?? [],
    todos: todos ?? [],
    editable: perm === 'edit',
    limite: { dia: ficha?.limite_dia ?? 0, hora: ficha?.limite_hora ?? '16:00' },
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx(); if (!c) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const perm = await puede(c, id); if (!perm) return NextResponse.json({ error: 'no' }, { status: 403 })
  const b = await req.json()
  const t = c.admin
  if (perm === 'modelo' && !['todoToggle', 'move'].includes(b.op)) return NextResponse.json({ error: 'solo lectura' }, { status: 403 })
  const dia = Number(b.dia)
  if (b.op === 'add') {
    if (!(dia >= 0 && dia <= 6)) return NextResponse.json({ error: 'dia' }, { status: 400 })
    const titulo = String(b.titulo || '').trim()
    if (titulo) await t.from('modelo_tareas').insert({ modelo_id: id, dia_semana: dia, titulo, created_by: c.uid })
  }
  else if (b.op === 'move') await t.from('modelo_tareas').update({ dia_semana: dia }).eq('id', b.tareaId).eq('modelo_id', id)
  else if (b.op === 'del') await t.from('modelo_tareas').delete().eq('id', b.tareaId).eq('modelo_id', id)
  else if (b.op === 'todoAdd') { const texto = String(b.texto || '').trim(); if (texto) await t.from('modelo_todos').insert({ modelo_id: id, texto, created_by: c.uid }) }
  else if (b.op === 'todoToggle') await t.from('modelo_todos').update({ hecho: !!b.hecho, hecho_at: b.hecho ? new Date().toISOString() : null }).eq('id', b.todoId).eq('modelo_id', id)
  else if (b.op === 'todoDel') await t.from('modelo_todos').delete().eq('id', b.todoId).eq('modelo_id', id)
  else if (b.op === 'todoLinks') await t.from('modelo_todos').update({ enlace_subir: b.enlace_subir ? String(b.enlace_subir).trim() : null, enlace_guia: b.enlace_guia ? String(b.enlace_guia).trim() : null }).eq('id', b.todoId).eq('modelo_id', id)
  else if (b.op === 'limite') {
    const d = dia >= 0 && dia <= 6 ? dia : 0
    const hora = /^\d{1,2}:\d{2}$/.test(String(b.hora || '')) ? String(b.hora) : '16:00'
    await t.from('modelos').update({ limite_dia: d, limite_hora: hora }).eq('id', id)
  }
  return NextResponse.json({ ok: true })
}
