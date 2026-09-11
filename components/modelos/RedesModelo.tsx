'use client'

import { useEffect, useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'

interface Red { ig_username: string; foto: string | null }

const igUrl = (u: string) => `https://www.instagram.com/${u.replace('@', '').trim()}`

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export default function RedesModelo({ modeloId, plano = false }: { modeloId: string; plano?: boolean }) {
  const [redes, setRedes] = useState<Red[] | null>(null)

  useEffect(() => {
    let vivo = true
    fetch(`/api/modelos/${modeloId}/redes`)
      .then(r => r.json())
      .then(d => { if (vivo) setRedes(d.cuentas ?? []) })
      .catch(() => { if (vivo) setRedes([]) })
    return () => { vivo = false }
  }, [modeloId])

  const contenido = redes === null ? (
    <div className="flex py-3"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
  ) : redes.length === 0 ? (
    <p className="text-xs" style={{ color: 'var(--muted)' }}>No hay cuentas de Instagram enlazadas todavía.</p>
  ) : (
    <div className="flex flex-col gap-2">
      {redes.map((r, i) => (
        <a key={i} href={igUrl(r.ig_username)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '9999px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>
            {r.foto ? <img src={r.foto} alt={r.ig_username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <InstagramIcon size={15} />}
          </div>
          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--foreground)' }}>@{r.ig_username.replace('@', '')}</span>
          <ExternalLink size={14} style={{ color: 'var(--gold)' }} />
        </a>
      ))}
    </div>
  )

  if (plano) return contenido

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <InstagramIcon size={15} />
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Redes de la modelo</p>
      </div>
      {contenido}
    </div>
  )
}
