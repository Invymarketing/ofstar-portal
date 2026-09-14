import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Compromiso por UNIDADES de contenido: cuántas unidades se han hecho de las comprometidas.
interface TodoRow { cantidad_objetivo?: number | null; cantidad_hecha?: number | null }
function resumenCompromiso(todos: TodoRow[]) {
  let objetivoSum = 0
  let hechoSum = 0
  let completas = 0
  for (const t of todos) {
    const obj = Math.max(1, Number(t.cantidad_objetivo ?? 1))
    const hec = Math.min(Math.max(0, Number(t.cantidad_hecha ?? 0)), obj)
    objetivoSum += obj
    hechoSum += hec
    if (hec >= obj) completas++
  }
  const pct = objetivoSum ? Math.round((100 * hechoSum) / objetivoSum) : 0
  return { total: todos.length, completadas: completas, pct, unidadesObjetivo: objetivoSum, unidadesHechas: hechoSum }
}

async function ctx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('role').eq('id', user.id).single()
  return { admin, uid: user.id, role: (p?.role ?? '') as string }
}

type Ctx = NonNullable<Awaited<ReturnType<typeof ctx>>>

async function puede(c: Ctx, id: string): Promise<'edit' | 'modelo' | null> {
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
  const [{ data: tareas }, { data: todos }, { data: boveda }, { data: ficha }] = await Promise.all([
    c.admin.from('modelo_tareas').select('id, dia_semana, titulo').eq('modelo_id', id).not('dia_semana', 'is', null).order('dia_semana').order('created_at'),
    c.admin.from('modelo_todos').select('id, texto, hecho, hecho_at, cantidad_objetivo, cantidad_hecha, enlace_subir, enlace_guia').eq('modelo_id', id).order('created_at'),
    c.admin.from('modelo_boveda').select('id, nombre, cantidad').eq('modelo_id', id).order('created_at'),
    c.admin.from('modelos').select('limite_dia, limite_hora, semana_inicio').eq('id', id).maybeSingle(),
  ])
  const compromiso = resumenCompromiso((todos ?? []) as TodoRow[])
  return NextResponse.json({
    tareas: tareas ?? [],
    todos: todos ?? [],
    boveda: boveda ?? [],
    editable: perm === 'edit',
    limite: { dia: ficha?.limite_dia ?? 0, hora: ficha?.limite_hora ?? '16:00' },
    semana_inicio: (ficha?.semana_inicio ? new Date(ficha.semana_inicio) : new Date()).toISOString(),
    compromiso,
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx(); if (!c) return NextResponse.json({ error: 'no' }, { status: 403 })
  const { id } = await params
  const perm = await puede(c, id); if (!perm) return NextResponse.json({ error: 'no' }, { status: 403 })
  const b = await req.json()
  const t = c.admin
  // La modelo solo puede marcar progreso/completar y mover; el resto (gestión) es de admin/manager.
  const opsModelo = ['todoToggle', 'todoProgress', 'move']
  if (perm === 'modelo' && !opsModelo.includes(b.op)) return NextResponse.json({ error: 'solo lectura' }, { status: 403 })
  const dia = Number(b.dia)

  const clampObj = (n: unknown) => Math.max(1, Math.min(9999, Math.round(Number(n) || 1)))
  const clampInt = (n: unknown) => Math.max(0, Math.min(9999, Math.round(Number(n) || 0)))

  if (b.op === 'add') {
    if (!(dia >= 0 && dia <= 6)) return NextResponse.json({ error: 'dia' }, { status: 400 })
    const titulo = String(b.titulo || '').trim()
    if (titulo) await t.from('modelo_tareas').insert({ modelo_id: id, dia_semana: dia, titulo, created_by: c.uid })
  }
  else if (b.op === 'move') await t.from('modelo_tareas').update({ dia_semana: dia }).eq('id', b.tareaId).eq('modelo_id', id)
  else if (b.op === 'del') await t.from('modelo_tareas').delete().eq('id', b.tareaId).eq('modelo_id', id)

  // ── Bóveda de tareas (tipos reutilizables) ──
  else if (b.op === 'bovedaAdd') {
    const nombre = String(b.nombre || '').trim()
    const cantidad = clampObj(b.cantidad)
    if (nombre) await t.from('modelo_boveda').insert({ modelo_id: id, nombre, cantidad, created_by: c.uid })
  }
  else if (b.op === 'bovedaEdit') {
    const patch: Record<string, unknown> = {}
    if (typeof b.nombre === 'string' && b.nombre.trim()) patch.nombre = b.nombre.trim()
    if (b.cantidad != null) patch.cantidad = clampObj(b.cantidad)
    if (Object.keys(patch).length) await t.from('modelo_boveda').update(patch).eq('id', b.bovedaId).eq('modelo_id', id)
  }
  else if (b.op === 'bovedaDel') await t.from('modelo_boveda').delete().eq('id', b.bovedaId).eq('modelo_id', id)

  // ── TO-DO ──
  else if (b.op === 'todoAdd') {
    const texto = String(b.texto || '').trim()
    const cantidad = clampObj(b.cantidad ?? 1)
    if (texto) await t.from('modelo_todos').insert({ modelo_id: id, texto, cantidad_objetivo: cantidad, cantidad_hecha: 0, hecho: false, created_by: c.uid })
  }
  else if (b.op === 'todoAddBoveda') {
    const { data: bov } = await t.from('modelo_boveda').select('nombre, cantidad').eq('id', b.bovedaId).eq('modelo_id', id).maybeSingle()
    if (bov?.nombre) await t.from('modelo_todos').insert({ modelo_id: id, texto: bov.nombre, cantidad_objetivo: clampObj(bov.cantidad), cantidad_hecha: 0, hecho: false, created_by: c.uid })
  }
  else if (b.op === 'todoProgress') {
    const { data: td } = await t.from('modelo_todos').select('cantidad_objetivo').eq('id', b.todoId).eq('modelo_id', id).maybeSingle()
    const obj = clampObj(td?.cantidad_objetivo ?? 1)
    const hecha = Math.min(clampInt(b.cantidad_hecha), obj)
    const completo = hecha >= obj
    await t.from('modelo_todos').update({ cantidad_hecha: hecha, hecho: completo, hecho_at: completo ? new Date().toISOString() : null }).eq('id', b.todoId).eq('modelo_id', id)
  }
  else if (b.op === 'todoObjetivo') {
    const obj = clampObj(b.cantidad_objetivo)
    const { data: td } = await t.from('modelo_todos').select('cantidad_hecha').eq('id', b.todoId).eq('modelo_id', id).maybeSingle()
    const hecha = Math.min(clampInt(td?.cantidad_hecha ?? 0), obj)
    const completo = hecha >= obj
    await t.from('modelo_todos').update({ cantidad_objetivo: obj, cantidad_hecha: hecha, hecho: completo, hecho_at: completo ? new Date().toISOString() : null }).eq('id', b.todoId).eq('modelo_id', id)
  }
  else if (b.op === 'todoToggle') {
    const { data: td } = await t.from('modelo_todos').select('cantidad_objetivo').eq('id', b.todoId).eq('modelo_id', id).maybeSingle()
    const obj = clampObj(td?.cantidad_objetivo ?? 1)
    const completo = !!b.hecho
    await t.from('modelo_todos').update({ hecho: completo, cantidad_hecha: completo ? obj : 0, hecho_at: completo ? new Date().toISOString() : null }).eq('id', b.todoId).eq('modelo_id', id)
  }
  else if (b.op === 'todoDel') await t.from('modelo_todos').delete().eq('id', b.todoId).eq('modelo_id', id)
  else if (b.op === 'todoLinks') await t.from('modelo_todos').update({ enlace_subir: b.enlace_subir ? String(b.enlace_subir).trim() : null, enlace_guia: b.enlace_guia ? String(b.enlace_guia).trim() : null }).eq('id', b.todoId).eq('modelo_id', id)
  else if (b.op === 'limite') {
    const d = dia >= 0 && dia <= 6 ? dia : 0
    const hora = /^\d{1,2}:\d{2}$/.test(String(b.hora || '')) ? String(b.hora) : '16:00'
    await t.from('modelos').update({ limite_dia: d, limite_hora: hora }).eq('id', id)
  }
  else if (b.op === 'nuevaSemana') {
    const { data: ficha } = await t.from('modelos').select('semana_inicio').eq('id', id).maybeSingle()
    const { data: todosActuales } = await t.from('modelo_todos').select('cantidad_objetivo, cantidad_hecha').eq('modelo_id', id)
    const lista = (todosActuales ?? []) as TodoRow[]
    if (lista.length > 0) {
      const r = resumenCompromiso(lista)
      await t.from('cumplimiento_semanal').insert({
        modelo_id: id,
        semana_inicio: ficha?.semana_inicio ?? null,
        semana_fin: new Date().toISOString(),
        total: r.total, completadas: r.completadas, puntuacion: r.pct,
      })
    }
    await t.from('modelo_todos').update({ hecho: false, hecho_at: null, cantidad_hecha: 0 }).eq('modelo_id', id)
    await t.from('modelos').update({ semana_inicio: new Date().toISOString() }).eq('id', id)
  }
  return NextResponse.json({ ok: true })
}
