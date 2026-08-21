// app/api/auth/callback/contentsnare/route.ts
// La puerta: Content Snare redirige aquí con ?code=... tras autorizar.
// Intercambiamos el code por el token, lo guardamos en Supabase y volvemos al CRM.
import { NextResponse } from 'next/server'
import { intercambiarCode } from '@/lib/content-snare'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const base = url.origin

  if (error) {
    return NextResponse.redirect(`${base}/?cs=error&motivo=${encodeURIComponent(error)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${base}/?cs=error&motivo=sin_code`)
  }

  try {
    await intercambiarCode(code)
    return NextResponse.redirect(`${base}/?cs=ok`)
  } catch (e: any) {
    return NextResponse.redirect(`${base}/?cs=error&motivo=${encodeURIComponent(e.message?.slice(0, 120) ?? 'fallo')}`)
  }
}
