import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function addDays(iso: string, n: number) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10) }
function lunesActual() { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); const [y, m, d] = p.split('-').map(Number); const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return addDays(p, -((dow + 6) % 7)) }

async function guard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager'].includes(p?.role ?? '')) return null
  return { admin, uid: user.id }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const url = new URL(req.url)
  const lunes = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('lunes') ?? '') ? url.searchParams.get('lunes')! : lunesActual()
  const domingo = addDays(lunes, 6)
  const [{ data: tareas }, { data: todos }] = await Promise.all([
    g.admin.from('modelo_tareas').select('id, fecha, titulo, completada, completada_at').eq('modelo_id', id).gte('fecha', lunes).lte('fecha', domingo).order('orden'),
    g.admin.from('modelo_todos').select('id, texto, hecho, hecho_at').eq('modelo_id', id).order('created_at'),
  ])
  return NextResponse.json({ tareas: tareas ?? [], todos: todos ?? [] })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(); if (!g) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const b = await req.json()
  const t = g.admin
  if (b.op === 'add') await t.from('modelo_tareas').insert({ modelo_id: id, fecha: b.fecha, titulo: String(b.titulo || '').trim(), created_by: g.uid })
  else if (b.op === 'toggle') await t.from('modelo_tareas').update({ completada: !!b.completada, completada_at: b.completada ? new Date().toISOString() : null }).eq('id', b.tareaId).eq('modelo_id', id)
  else if (b.op === 'move') await t.from('modelo_tareas').update({ fecha: b.fecha }).eq('id', b.tareaId).eq('modelo_id', id)
  else if (b.op === 'del') await t.from('modelo_tareas').delete().eq('id', b.tareaId).eq('modelo_id', id)
  else if (b.op === 'todoAdd') await t.from('modelo_todos').insert({ modelo_id: id, texto: String(b.texto || '').trim(), created_by: g.uid })
  else if (b.op === 'todoToggle') await t.from('modelo_todos').update({ hecho: !!b.hecho, hecho_at: b.hecho ? new Date().toISOString() : null }).eq('id', b.todoId).eq('modelo_id', id)
  else if (b.op === 'todoDel') await t.from('modelo_todos').delete().eq('id', b.todoId).eq('modelo_id', id)
  return NextResponse.json({ ok: true })
}
