// app/api/cron/send-telegram/route.ts
// Envía los mensajes programados cuya fecha ya llegó. Protegido con CRON_SECRET
// o sesión admin/manager (para poder dispararlo desde un botón).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarMensaje } from '@/lib/telegram'

export const maxDuration = 300

async function autorizado(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth === `Bearer ${secret}`) return true
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const admin = createAdminClient()
    const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
    return !!me && ['admin', 'manager', 'team_leader'].includes(me.role)
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const ahora = new Date().toISOString()

  const { data: pendientes, error } = await admin
    .from('mensajes_telegram')
    .select('id, modelo_id, chat_id, tipo, texto, archivo_url')
    .eq('enviado', false)
    .lte('fecha_programada', ahora)
    .order('fecha_programada')
    .limit(25)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Grupos de Telegram por modelo
  const modeloIds = [...new Set((pendientes ?? []).map((m) => m.modelo_id).filter(Boolean))] as string[]
  const grupos = new Map<string, string>()
  if (modeloIds.length > 0) {
    const { data: modelos } = await admin
      .from('modelos').select('id, telegram_group_id').in('id', modeloIds)
    for (const m of modelos ?? []) if (m.telegram_group_id) grupos.set(m.id, m.telegram_group_id)
  }

  let enviados = 0
  const fallos: { id: string; motivo: string }[] = []

  for (const m of pendientes ?? []) {
    const chatId = m.chat_id || (m.modelo_id ? grupos.get(m.modelo_id) : null)
    try {
      if (!chatId) throw new Error('El modelo no tiene grupo de Telegram configurado')
      await enviarMensaje(chatId, m.tipo, m.texto, m.archivo_url)
      await admin.from('mensajes_telegram')
        .update({ enviado: true, enviado_at: new Date().toISOString(), error: null })
        .eq('id', m.id)
      enviados++
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err)
      await admin.from('mensajes_telegram').update({ error: motivo }).eq('id', m.id)
      fallos.push({ id: m.id, motivo })
    }
  }

  return NextResponse.json({
    ok: true,
    pendientes: (pendientes ?? []).length,
    enviados,
    fallidos: fallos.length,
    fallos,
  })
}
