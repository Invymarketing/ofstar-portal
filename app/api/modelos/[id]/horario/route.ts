import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Utilidades de fecha (hora de España) ──
function madridToUtc(y: number, mo: number, d: number, hh: number, mm: number): Date {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  let t = Date.UTC(y, mo, d, hh, mm, 0)
  for (let i = 0; i < 3; i++) {
    const parts: Record<string, string> = {}
    for (const p of dtf.formatToParts(new Date(t))) parts[p.type] = p.value
    const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
    t -= (asUTC - t)
  }
  return new Date(t)
}

const WD: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

function calcularDeadline(semanaInicio: Date, limiteDia: number, limiteHora: string): Date {
  const [hh, mm] = String(limiteHora || '16:00').split(':').map(Number)
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(semanaInicio)
  const [y0, m0, d0] = fecha.split('-').map(Number)
  for (let off = 0; off <= 8; off++) {
    const cand = madridToUtc(y0, m0 - 1, d0 + off, hh || 0, mm || 0)
    const wdStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', weekday: 'short' }).format(cand)
    if (WD[wdStr] === limiteDia && cand.getTime() >= semanaInicio.getTime()) return cand
  }
  return new Date(semanaInicio.getTime() + 7 * 86400000)
}

function nota(hecho: boolean, hechoAt: string | null, deadline: Date): number {
  if (!hecho || !hechoAt) return 0
  const h = (new Date(hechoAt).getTime() - deadline.getTime()) / 3600000
  if (h <= 0) return 100
  if (h < 24) return 85
  if (h < 48) return 65
  if (h < 72) return 40
  return 10
}

function resumenCompromiso(todos: { hecho: boolean; hecho_at: string | null }[], deadline: Date) {
  const total = todos.length
  const completadas = todos.filter(t => t.hecho).length
  const pct = total ? Math.round(todos.reduce((a, t) => a + nota(!!t.hecho, t.hecho_at, deadline), 0) / total) : 0
  return { total, completadas, pct }
}

// ── Auth ──
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
    c.admin.from('modelo_todos').select('id, texto, hecho, hecho_at, enlace_subir, enlace_guia, descripcion, imagenes').eq('modelo_id', id).order('created_at'),
    c.admin.from('modelos').select('limite_dia, limite_hora, semana_inicio').eq('id', id).maybeSingle(),
  ])
  const limiteDia = ficha?.limite_dia ?? 0
  const limiteHora = ficha?.limite_hora ?? '16:00'
  const semanaInicio = ficha?.semana_inicio ? new Date(ficha.semana_inicio) : new Date()
  const deadline = calcularDeadline(semanaInicio, limiteDia, limiteHora)
  const compromiso = resumenCompromiso((todos ?? []) as { hecho: boolean; hecho_at: string | null }[], deadline)
  return NextResponse.json({
    tareas: tareas ?? [],
    todos: todos ?? [],
    editable: perm === 'edit',
    limite: { dia: limiteDia, hora: limiteHora },
    semana_inicio: semanaInicio.toISOString(),
    compromiso,
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
  else if (b.op === 'todoDesc') await t.from('modelo_todos').update({ descripcion: b.descripcion ? String(b.descripcion) : null }).eq('id', b.todoId).eq('modelo_id', id)
  else if (b.op === 'todoImgDel') {
    const { data: td } = await t.from('modelo_todos').select('imagenes').eq('id', b.todoId).eq('modelo_id', id).maybeSingle()
    const actuales: string[] = Array.isArray(td?.imagenes) ? (td.imagenes as string[]) : []
    const url = String(b.url || '')
    const nuevas = actuales.filter((u) => u !== url)
    await t.from('modelo_todos').update({ imagenes: nuevas }).eq('id', b.todoId).eq('modelo_id', id)
    const marker = '/todo-imagenes/'
    const idx = url.indexOf(marker)
    if (idx >= 0) { try { await t.storage.from('todo-imagenes').remove([url.slice(idx + marker.length)]) } catch { /* noop */ } }
  }
  else if (b.op === 'limite') {
    const d = dia >= 0 && dia <= 6 ? dia : 0
    const hora = /^\d{1,2}:\d{2}$/.test(String(b.hora || '')) ? String(b.hora) : '16:00'
    await t.from('modelos').update({ limite_dia: d, limite_hora: hora }).eq('id', id)
  }
  else if (b.op === 'nuevaSemana') {
    const { data: ficha } = await t.from('modelos').select('limite_dia, limite_hora, semana_inicio').eq('id', id).maybeSingle()
    const { data: todosActuales } = await t.from('modelo_todos').select('hecho, hecho_at').eq('modelo_id', id)
    const lista = (todosActuales ?? []) as { hecho: boolean; hecho_at: string | null }[]
    if (lista.length > 0) {
      const semanaInicio = ficha?.semana_inicio ? new Date(ficha.semana_inicio) : new Date()
      const deadline = calcularDeadline(semanaInicio, ficha?.limite_dia ?? 0, ficha?.limite_hora ?? '16:00')
      const r = resumenCompromiso(lista, deadline)
      await t.from('cumplimiento_semanal').insert({
        modelo_id: id,
        semana_inicio: ficha?.semana_inicio ?? null,
        semana_fin: new Date().toISOString(),
        total: r.total, completadas: r.completadas, puntuacion: r.pct,
      })
    }
    await t.from('modelo_todos').update({ hecho: false, hecho_at: null }).eq('modelo_id', id)
    await t.from('modelos').update({ semana_inicio: new Date().toISOString() }).eq('id', id)
  }
  return NextResponse.json({ ok: true })
}
