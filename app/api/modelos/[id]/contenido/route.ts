// app/api/modelos/[id]/contenido/route.ts
// Motor de conteo: para una modelo, lee su TO-DO (Notion) y cuenta lo entregado (Drive)
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encontrarTodoPageId, leerTareas } from '@/lib/notion-todo'
import { contarArchivos } from '@/lib/google-drive'

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
    .from('modelos').select('id, full_name, model_name, notion_url').eq('id', id).single()
  if (!modelo) return NextResponse.json({ error: 'modelo_no_encontrada' }, { status: 404 })

  const nombre = modelo.model_name || modelo.full_name
  try {
    const pageId = await encontrarTodoPageId(nombre, modelo.notion_url)
    if (!pageId) return NextResponse.json({ ok: true, encontrado: false, tareas: [] })

    // El contenido de OnlyFans se cuenta aparte (Content Snare), así que lo excluimos
    // del control de Notion para que no salga duplicado ni sin dato.
    const tareas = (await leerTareas(pageId)).filter(t => !/only/i.test(t.texto ?? ''))

    const resultado = []
    for (const t of tareas) {
      let entregado: number | null = null
      if (t.driveFolderId) {
        try { entregado = await contarArchivos(t.driveFolderId) } catch { entregado = null }
      }
      const objetivo = t.objetivo
      let estado: 'completo' | 'corta' | 'sin_objetivo' | 'sin_carpeta' = 'sin_carpeta'
      if (t.driveFolderId) {
        if (objetivo == null) estado = 'sin_objetivo'
        else estado = (entregado ?? 0) >= objetivo ? 'completo' : 'corta'
      }
      resultado.push({
        texto: t.texto,
        objetivo,
        entregado,
        tieneCarpeta: !!t.driveFolderId,
        estado,
      })
    }

    // resumen de cumplimiento (solo tareas con objetivo y carpeta)
    const conObjetivo = resultado.filter(r => r.objetivo != null && r.tieneCarpeta)
    const completas = conObjetivo.filter(r => r.estado === 'completo').length
    const pct = conObjetivo.length ? Math.round((completas / conObjetivo.length) * 100) : null

    return NextResponse.json({
      ok: true,
      encontrado: true,
      modelo: nombre,
      resumen: { total: conObjetivo.length, completas, pct },
      tareas: resultado,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'motor_error', message: String(err?.message || err) }, { status: 500 })
  }
}
