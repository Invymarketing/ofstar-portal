// app/api/cron/ingesta-drive/route.ts
// Revisa la carpeta de Drive de cada modelo; por cada archivo NUEVO genera con
// Claude un "buenos días" (8:00) y un CTA con la foto (20:00) del día siguiente,
// y los deja programados en mensajes_telegram. Reemplaza el bot "Prueba claude".
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listarArchivos, descargarArchivo, extraerFolderId } from '@/lib/google-drive'
import { generarBuenosDias, generarCTA } from '@/lib/anthropic'

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
  } catch { return false }
}

// Devuelve una Date en UTC para el día (+n) a la hora dada
function diaAHora(base: Date, addDays: number, hora: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + addDays)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hora, 0, 0)).toISOString()
}

export async function GET(request: NextRequest) {
  if (!(await autorizado(request))) return NextResponse.json({ error: 'no_autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: modelos } = await admin
    .from('modelos')
    .select('id, model_name, drive_content_folder_id, telegram_group_id, of_trial_link')
    .eq('activa', true)
    .not('drive_content_folder_id', 'is', null)
    .not('telegram_group_id', 'is', null)

  const resumen: { modelo: string; nuevos: number }[] = []
  const fallos: { modelo: string; motivo: string }[] = []
  let totalNuevos = 0

  for (const m of modelos ?? []) {
    try {
      const folderId = extraerFolderId(String(m.drive_content_folder_id))
      if (!folderId) continue

      const archivos = await listarArchivos(folderId)
      if (archivos.length === 0) continue

      // Cuáles ya se procesaron
      const { data: ya } = await admin
        .from('contenido_ingerido').select('drive_file_id')
        .in('drive_file_id', archivos.map((a) => a.id))
      const procesados = new Set((ya ?? []).map((x) => x.drive_file_id))
      const nuevos = archivos.filter((a) => !procesados.has(a.id))
      if (nuevos.length === 0) continue

      // Día base = último programado del modelo, o hoy
      const { data: ult } = await admin
        .from('mensajes_telegram').select('fecha_programada')
        .eq('modelo_id', m.id).order('fecha_programada', { ascending: false }).limit(1)
      let cursor = ult && ult[0] ? new Date(ult[0].fecha_programada) : new Date()

      for (const f of nuevos) {
        // Subir el archivo a Storage (URL pública para Telegram)
        const buffer = await descargarArchivo(f.id)
        const ext = (f.name.split('.').pop() || (f.mimeType.includes('video') ? 'mp4' : 'jpg')).toLowerCase()
        const path = `${m.id}/${f.id}.${ext}`
        const { error: upErr } = await admin.storage.from('telegram')
          .upload(path, buffer, { contentType: f.mimeType, upsert: true })
        if (upErr) throw new Error('storage: ' + upErr.message)
        const url = admin.storage.from('telegram').getPublicUrl(path).data.publicUrl
        const tipo = f.mimeType.includes('video') ? 'video' : 'foto'

        // Captions con Claude
        const buenosDias = await generarBuenosDias()
        const cta = await generarCTA()
        const ctaFull = m.of_trial_link ? `${cta}\n${m.of_trial_link}` : cta

        // Siguiente día: texto 08:00, imagen 20:00
        const fechaTexto = diaAHora(cursor, 1, 8)
        const fechaImg = diaAHora(cursor, 1, 20)
        cursor = new Date(fechaImg)

        await admin.from('mensajes_telegram').insert([
          { modelo_id: m.id, tipo: 'texto', texto: buenosDias, fecha_programada: fechaTexto, enviado: false },
          { modelo_id: m.id, tipo, texto: ctaFull, archivo_url: url, fecha_programada: fechaImg, enviado: false },
        ])
        await admin.from('contenido_ingerido').insert({ drive_file_id: f.id, modelo_id: m.id })
        totalNuevos++
      }
      resumen.push({ modelo: m.model_name, nuevos: nuevos.length })
    } catch (err) {
      fallos.push({ modelo: m.model_name, motivo: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ ok: true, archivos_nuevos: totalNuevos, resumen, fallidos: fallos.length, fallos })
}
