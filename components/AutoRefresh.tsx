'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Refresca los datos del servidor (server components) cada `ms` milisegundos
 * SIN recargar la página: el usuario no pierde scroll, foco ni lo que esté escribiendo.
 *
 * Uso — pégalo dentro del JSX de cualquier page.tsx:
 *   import AutoRefresh from '@/components/AutoRefresh'
 *   ...
 *   <AutoRefresh />                 // por defecto cada 20s
 *   <AutoRefresh ms={10000} />      // cada 10s (paneles en vivo)
 *   <AutoRefresh ms={60000} />      // cada 60s (paneles pesados)
 *
 * Se pausa solo cuando la pestaña está en segundo plano (ahorra recursos)
 * y refresca de inmediato al volver a ella.
 */
export default function AutoRefresh({ ms = 20000 }: { ms?: number }) {
  const router = useRouter()
  const savedMs = useRef(ms)
  savedMs.current = ms

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (timer) return
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') router.refresh()
      }, savedMs.current)
    }
    const stop = () => { if (timer) { clearInterval(timer); timer = null } }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') { router.refresh(); start() }
      else stop()
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [router])

  return null
}
