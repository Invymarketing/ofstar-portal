import { NextResponse } from 'next/server'
import { getUserProfile, getUserClips } from '@/lib/hikerapi'

export async function GET() {
  const username = 'juliaxpols'
  try {
    const perfil = await getUserProfile(username)
    const clips = await getUserClips(perfil.pk, 12)
    return NextResponse.json({ encontrado: true, seguidores: perfil.follower_count, es_privada: perfil.is_private, num_reels: clips.length })
  } catch (err) {
    return NextResponse.json({ encontrado: false, error: String(err) })
  }
}
