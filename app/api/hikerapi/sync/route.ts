// app/api/hikerapi/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserProfile, getUserMedias, getUserClips, calcEngagementRate, procesarReels } from '@/lib/hikerapi'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'manager', 'creativo'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'sin_permiso' }, { status: 403 })
  }

  const { cuenta_id } = await request.json()
  if (!cuenta_id) return NextResponse.json({ error: 'falta_cuenta_id' }, { status: 400 })

  const { data: cuenta } = await admin.from('cuentas_analytics').select('*').eq('id', cuenta_id).single()
  if (!cuenta) return NextResponse.json({ error: 'cuenta_no_encontrada' }, { status: 404 })

  try {
    const perfil = await getUserProfile(cuenta.ig_username)
    const [medias, clips] = await Promise.all([
      getUserMedias(perfil.pk, 12),
      getUserClips(perfil.pk, 60),
    ])

    const engagement = calcEngagementRate(medias, perfil.follower_count)
    const reels = procesarReels(clips)
    const hoy = new Date().toISOString().split('T')[0]

    await admin.from('cuentas_analytics').update({
      ig_user_id: perfil.pk,
      profile_pic_url: perfil.profile_pic_url_hd || perfil.profile_pic_url || null,
      full_name: perfil.full_name || null,
      ultima_sync: new Date().toISOString(),
    }).eq('id', cuenta_id)

    await admin.from('metricas_analytics').upsert({
      cuenta_id, fecha: hoy,
      seguidores: perfil.follower_count,
      siguiendo: perfil.following_count,
      posts_total: perfil.media_count,
      engagement_rate: engagement,
    }, { onConflict: 'cuenta_id,fecha' })

    // GUARDADO EN LOTE: filtramos reels con id válido y quitamos duplicados,
    // luego un solo upsert con todos de golpe (mucho más rápido y fiable)
    const vistos = new Set<string>()
    const filasReels = reels
      .filter(r => {
        if (!r.ig_media_id) return false
        if (vistos.has(r.ig_media_id)) return false
        vistos.add(r.ig_media_id)
        return true
      })
      .map(r => ({
        cuenta_id,
        ig_media_id: r.ig_media_id,
        url: r.url,
        thumbnail_url: r.thumbnail_url,
        caption: r.caption,
        views: r.views,
        likes: r.likes,
        comentarios: r.comentarios,
        ratio_vl: r.ratio_vl,
        fecha_publicacion: r.fecha_publicacion,
      }))

    let guardados = 0
    if (filasReels.length > 0) {
      const { error: errReels, count } = await admin
        .from('reels_analytics')
        .upsert(filasReels, { onConflict: 'cuenta_id,ig_media_id', count: 'exact' })
      if (errReels) {
        console.error('Error guardando reels:', errReels)
        return NextResponse.json({ error: 'reels_error', message: errReels.message, reels_intentados: filasReels.length }, { status: 500 })
      }
      guardados = count ?? filasReels.length
    }

    return NextResponse.json({
      ok: true,
      seguidores: perfil.follower_count,
      engagement,
      reels_traidos: reels.length,
      reels_guardados: guardados,
    })
  } catch (err) {
    console.error('Error sync:', err)
    return NextResponse.json({ error: 'sync_failed', message: String(err) }, { status: 500 })
  }
}
