// app/api/cron/sync-all/route.ts
// Disenado para una API lenta + limite de tiempo de Vercel.
// Se ejecuta cada 30 min y retoma por donde quedo.
// FASE 1: seguidores de las cuentas que AUN no tienen dato de hoy (prioridad, rapido).
// FASE 2: reels con el tiempo que sobre, empezando por las mas desactualizadas.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserProfile, getUserMedias, getUserClips, calcEngagementRate, procesarReels } from '@/lib/hikerapi'

export const maxDuration = 300

const CONC_METRICAS = 8
const CONC_REELS = 3
const PRESUPUESTO_FASE1_MS = 30000  // hasta 30s para seguidores
const PRESUPUESTO_TOTAL_MS = 50000  // parar del todo a los 50s

export async function GET(request: NextRequest) {
  const inicio = Date.now()
  const transcurrido = () => Date.now() - inicio

  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const hoy = new Date().toISOString().split('T')[0]

  const { data: cuentas, error } = await admin
    .from('cuentas_analytics')
    .select('id, ig_username, ultima_sync')
    .eq('activa', true)
    .order('ultima_sync', { ascending: true, nullsFirst: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const lista = cuentas ?? []

  // Que cuentas ya tienen el dato de seguidores de HOY (para no repetir)
  const { data: hechas } = await admin
    .from('metricas_analytics').select('cuenta_id').eq('fecha', hoy)
  const yaHechasHoy = new Set((hechas ?? []).map((r: any) => r.cuenta_id))

  const pkPorCuenta = new Map<string, string>()

  // ---------- FASE 1: SEGUIDORES (solo las que faltan hoy) ----------
  let metricasOk = 0
  const fallosMetricas: { cuenta: string; motivo: string }[] = []
  const pendientes = lista.filter((c: any) => !yaHechasHoy.has(c.id))
  for (let i = 0; i < pendientes.length; i += CONC_METRICAS) {
    if (transcurrido() > PRESUPUESTO_FASE1_MS) break
    const tanda = pendientes.slice(i, i + CONC_METRICAS)
    await Promise.all(tanda.map(async (c: any) => {
      try {
        const perfil = await getUserProfile(c.ig_username)
        const medias = await getUserMedias(perfil.pk, 12)
        const engagement = calcEngagementRate(medias, perfil.follower_count)
        pkPorCuenta.set(c.id, perfil.pk)
        await admin.from('cuentas_analytics').update({
          ig_user_id: perfil.pk,
          profile_pic_url: perfil.profile_pic_url_hd || perfil.profile_pic_url || null,
          full_name: perfil.full_name || null,
        }).eq('id', c.id)
        await admin.from('metricas_analytics').upsert({
          cuenta_id: c.id, fecha: hoy,
          seguidores: perfil.follower_count,
          siguiendo: perfil.following_count,
          posts_total: perfil.media_count,
          engagement_rate: engagement,
        }, { onConflict: 'cuenta_id,fecha' })
        metricasOk++
      } catch (err) {
        fallosMetricas.push({ cuenta: c.ig_username, motivo: String(err).slice(0, 200) })
      }
    }))
  }
  const segFase1 = Math.round(transcurrido() / 1000)

  // ---------- FASE 2: REELS con el tiempo que sobre ----------
  let reelsOk = 0
  const fallosReels: { cuenta: string; motivo: string }[] = []
  for (let i = 0; i < lista.length; i += CONC_REELS) {
    if (transcurrido() > PRESUPUESTO_TOTAL_MS) break
    const tanda = lista.slice(i, i + CONC_REELS)
    await Promise.all(tanda.map(async (c: any) => {
      try {
        let pk = pkPorCuenta.get(c.id)
        if (!pk) { const p = await getUserProfile(c.ig_username); pk = p.pk }
        const clips = await getUserClips(pk, 60)
        const reels = procesarReels(clips)
        const vistos = new Set<string>()
        const filas = reels
          .filter((r: any) => { if (!r.ig_media_id || vistos.has(r.ig_media_id)) return false; vistos.add(r.ig_media_id); return true })
          .map((r: any) => ({
            cuenta_id: c.id, ig_media_id: r.ig_media_id, url: r.url,
            thumbnail_url: r.thumbnail_url, caption: r.caption, views: r.views,
            likes: r.likes, comentarios: r.comentarios, ratio_vl: r.ratio_vl,
            fecha_publicacion: r.fecha_publicacion,
          }))
        if (filas.length > 0) {
          await admin.from('reels_analytics').upsert(filas, { onConflict: 'cuenta_id,ig_media_id' })
        }
        await admin.from('cuentas_analytics').update({ ultima_sync: new Date().toISOString() }).eq('id', c.id)
        reelsOk++
      } catch (err) {
        fallosReels.push({ cuenta: c.ig_username, motivo: String(err).slice(0, 200) })
      }
    }))
  }

  return NextResponse.json({
    ok: true,
    fecha: hoy,
    cuentas_totales: lista.length,
    seguidores_pendientes_al_empezar: pendientes.length,
    seguidores_hechos_esta_pasada: metricasOk,
    seguidores_fallidos: fallosMetricas.length,
    segundos_fase1: segFase1,
    reels_hechos_esta_pasada: reelsOk,
    reels_fallidos: fallosReels.length,
    segundos_total: Math.round(transcurrido() / 1000),
    fallos_metricas: fallosMetricas,
    fallos_reels: fallosReels,
  })
}
