import Link from 'next/link'
import { Clock, ArrowLeft } from 'lucide-react'

interface ComingSoonProps {
  moduleName: string
  moduleNumber: number
  description: string
  phase: number
}

export default function ComingSoon({
  moduleName,
  moduleNumber,
  description,
  phase,
}: ComingSoonProps) {
  return (
    <div className="max-w-2xl mx-auto pt-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft size={13} />
        Volver al inicio
      </Link>

      <div className="bg-surface border border-border rounded-2xl p-10 text-center">
        {/* Phase badge */}
        <div className="inline-flex items-center gap-1.5 bg-border px-3 py-1.5 rounded-full mb-6">
          <Clock size={12} className="text-muted" />
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            Fase {phase}
          </span>
        </div>

        {/* Module number */}
        <div className="w-16 h-16 rounded-2xl bg-gold/5 border border-gold/10 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl font-bold text-gold/40">{moduleNumber}</span>
        </div>

        <h1 className="text-xl font-bold text-foreground mb-3">{moduleName}</h1>
        <p className="text-sm text-muted leading-relaxed max-w-md mx-auto mb-8">
          {description}
        </p>

        <div className="inline-flex items-center gap-2 bg-gold/5 border border-gold/15 rounded-xl px-5 py-3">
          <div className="w-2 h-2 bg-gold/40 rounded-full animate-pulse" />
          <span className="text-sm text-gold/70 font-medium">Próximamente</span>
        </div>
      </div>
    </div>
  )
}
