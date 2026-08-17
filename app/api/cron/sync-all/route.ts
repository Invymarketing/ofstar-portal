// app/api/cron/sync-all/route.ts
// Sincroniza TODAS las cuentas activas de golpe. Protegido con CRON_SECRET.
// Pensado para que Railway lo llame una vez al día.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserProfile, getUserMedias, getUserClips, calcEngagementRate, procesarReels } from '@/lib/hikerapi'

export const maxDuration = 300 // hasta 5 min por si hay muchas cuentas

export async function GET(request: NextRequest) {
  // --- Cerradura: solo pasa quien trae la llave correcta ---
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'no_autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: cuentas, error } = await admin
    .from('cuentas_analytics')
    .select('id, ig_username')
    .eq('activa', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hoy = new Date().toISOString().split('T')[0]
  let ok = 0
  const fallos: { cuenta: string; motivo: string }[] = []

  for (const cuenta of cuentas ?? []) {
    try {
      const perfil = await getUserProfile(cuenta.ig_username)
      const [medias, clips] = await Promise.all([
        getUserMedias(perfil.pk, 12),
        getUserClips(perfil.pk, 60),
      ])
      const engagement = calcEngagementRate(medias, perfil.follower_count)
      const reels = procesarReels(clips)

      await admin.from('cuentas_analytics').update({
        ig_user_id: perfil.pk,
        profile_pic_url: perfil.profile_pic_url_hd || perfil.profile_pic_url || null,
        full_name: perfil.full_name || null,
        ultima_sync: new Date().toISOString(),
      }).eq('id', cuenta.id)

      await admin.from('metricas_analytics').upsert({
        cuenta_id: cuenta.id, fecha: hoy,
        seguidores: perfil.follower_count,
        siguiendo: perfil.following_count,
        posts_total: perfil.media_count,
        engagement_rate: engagement,
      }, { onConflict: 'cuenta_id,fecha' })

      const vistos = new Set<string>()
      const filasReels = reels
        .filter(r => { if (!r.ig_media_id || vistos.has(r.ig_media_id)) return false; vistos.add(r.ig_media_id); return true })
        .map(r => ({
          cuenta_id: cuenta.id, ig_media_id: r.ig_media_id, url: r.url,
          thumbnail_url: r.thumbnail_url, caption: r.caption, views: r.views,
          likes: r.likes, comentarios: r.comentarios, ratio_vl: r.ratio_vl,
          fecha_publicacion: r.fecha_publicacion,
        }))
      if (filasReels.length > 0) {
        await admin.from('reels_analytics').upsert(filasReels, { onConflict: 'cuenta_id,ig_media_id' })
      }
      ok++
    } catch (err) {
      fallos.push({ cuenta: cuenta.ig_username, motivo: String(err) })
    }
  }

  return NextResponse.json({
    ok: true,
    fecha: hoy,
    cuentas_totales: (cuentas ?? []).length,
    sincronizadas: ok,
    fallidas: fallos.length,
    fallos,
  })
}
