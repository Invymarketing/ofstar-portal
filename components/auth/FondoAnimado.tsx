'use client'

type Tipo = 0 | 1 | 2 | 3

function Icono({ t, size }: { t: Tipo; size: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24' as const }
  if (t === 0) {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    )
  }
  if (t === 1) {
    return (
      <svg {...common} fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  }
  if (t === 2) {
    return (
      <svg {...common} fill="currentColor">
        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    )
  }
  return (
    <svg {...common} fill="currentColor">
      <path d="M24 11.779c0-1.459-1.192-2.645-2.657-2.645-.715 0-1.363.286-1.84.746-1.81-1.191-4.259-1.949-6.971-2.046l1.483-4.669 4.016.941-.006.058c0 1.193.975 2.163 2.174 2.163 1.198 0 2.172-.97 2.172-2.163s-.975-2.164-2.172-2.164c-.92 0-1.704.574-2.021 1.379l-4.329-1.015a.379.379 0 0 0-.44.249l-1.654 5.207c-2.759.076-5.245.83-7.075 2.032-.475-.453-1.117-.732-1.822-.732C1.192 9.135 0 10.32 0 11.779c0 1.001.562 1.87 1.386 2.309-.054.286-.084.578-.084.876 0 4.117 4.796 7.457 10.711 7.457 5.915 0 10.711-3.34 10.711-7.457 0-.297-.03-.589-.084-.875.824-.439 1.386-1.309 1.386-2.31zm-17.495.98c0-.958.783-1.741 1.741-1.741.959 0 1.742.783 1.742 1.741 0 .959-.783 1.742-1.742 1.742-.958 0-1.741-.783-1.741-1.742zm9.995 4.256c-1.222 1.222-3.552 1.316-4.235 1.316-.683 0-3.013-.094-4.234-1.316a.393.393 0 0 1 0-.556.393.393 0 0 1 .556 0c.775.774 2.428.94 3.678.94 1.251 0 2.905-.166 3.679-.94a.394.394 0 0 1 .556 0 .394.394 0 0 1 0 .556zm-.298-2.514c-.959 0-1.742-.783-1.742-1.742 0-.958.783-1.741 1.742-1.741.958 0 1.741.783 1.741 1.741 0 .959-.783 1.742-1.741 1.742z" />
    </svg>
  )
}

const ICONOS: { l: number; s: number; d: number; delay: number; o: number; t: Tipo }[] = [
  { l: 4, s: 40, d: 22, delay: 0, o: 0.10, t: 0 },
  { l: 12, s: 24, d: 28, delay: 6, o: 0.07, t: 1 },
  { l: 19, s: 54, d: 26, delay: 2, o: 0.08, t: 2 },
  { l: 27, s: 28, d: 20, delay: 9, o: 0.06, t: 3 },
  { l: 34, s: 36, d: 30, delay: 4, o: 0.09, t: 0 },
  { l: 42, s: 22, d: 24, delay: 12, o: 0.06, t: 1 },
  { l: 49, s: 48, d: 27, delay: 1, o: 0.08, t: 3 },
  { l: 57, s: 30, d: 21, delay: 7, o: 0.07, t: 2 },
  { l: 64, s: 26, d: 29, delay: 3, o: 0.06, t: 0 },
  { l: 71, s: 44, d: 25, delay: 10, o: 0.09, t: 1 },
  { l: 78, s: 24, d: 23, delay: 5, o: 0.06, t: 2 },
  { l: 85, s: 38, d: 31, delay: 8, o: 0.08, t: 3 },
  { l: 91, s: 28, d: 22, delay: 2, o: 0.07, t: 0 },
  { l: 9, s: 30, d: 33, delay: 14, o: 0.06, t: 3 },
  { l: 38, s: 26, d: 34, delay: 16, o: 0.05, t: 2 },
  { l: 68, s: 34, d: 32, delay: 13, o: 0.07, t: 1 },
  { l: 96, s: 22, d: 28, delay: 6, o: 0.06, t: 2 },
  { l: 23, s: 20, d: 26, delay: 18, o: 0.05, t: 1 },
]

export default function FondoAnimado() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes skRise {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: var(--op); }
          85%  { opacity: var(--op); }
          100% { transform: translateY(calc(-100vh - 180px)) rotate(22deg); opacity: 0; }
        }
        .sk-rise { position: absolute; bottom: -90px; color: var(--gold); animation: skRise linear infinite; will-change: transform, opacity; }
        @media (prefers-reduced-motion: reduce) { .sk-rise { animation: none; opacity: var(--op); } }
      ` }} />
      {ICONOS.map((it, i) => (
        <span
          key={i}
          className="sk-rise"
          style={{ left: `${it.l}%`, animationDuration: `${it.d}s`, animationDelay: `${it.delay}s`, '--op': it.o } as React.CSSProperties}
        >
          <Icono t={it.t} size={it.s} />
        </span>
      ))}
    </div>
  )
}
