// app/api/metadata/route.ts
// Genera N variantes con metadata cambiada llamando al motor (Railway).
// El x-api-key va en la variable de entorno METADATA_API_KEY (no en el código).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300 // hasta 5 min (varios videos pueden tardar)

const MOTOR_URL = 'https://motor-metadata-production.up.railway.app/variant'
const MAX_VERSIONES = 12

export async function POST(request: NextRequest) {
  // Solo usuarios internos logueados
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_autenticado' }, { status: 401 })
  const admin = createAdminClient()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['admin', 'manager', 'creativo', 'team_leader', 'va'].includes(me.role)) {
    return NextResponse.json({ error: 'sin_permiso' }, { status: 403 })
  }

  const apiKey = process.env.METADATA_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Falta METADATA_API_KEY en las variables de entorno' }, { status: 500 })

  let body: { fileUrl?: string; n?: number }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'json_invalido' }, { status: 400 }) }

  const fileUrl = body.fileUrl
  const n = Math.min(Math.max(Number(body.n) || 1, 1), MAX_VERSIONES)
  if (!fileUrl) return NextResponse.json({ error: 'Falta el archivo (fileUrl)' }, { status: 400 })

  const variantes: { url: string; filename: string }[] = []
  const fallos: string[] = []

  for (let i = 1; i <= n; i++) {
    try {
      const seed = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`
      const r = await fetch(MOTOR_URL, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({ videoUrl: fileUrl, seed }),
      })
      if (!r.ok) { fallos.push(`v${i}: HTTP ${r.status}`); continue }
      const j = await r.json()
      const data = j?.data ?? j
      if (data?.url) variantes.push({ url: data.url, filename: data.filename ?? `variante_${i}` })
      else fallos.push(`v${i}: respuesta sin url`)
    } catch (err) {
      fallos.push(`v${i}: ${err instanceof Error ? err.message : 'error'}`)
    }
  }

  return NextResponse.json({ ok: true, solicitadas: n, generadas: variantes.length, variantes, fallos })
}
