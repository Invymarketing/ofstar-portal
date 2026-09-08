import Image from 'next/image'
import LoginForm from '@/components/auth/LoginForm'
import FondoAnimado from '@/components/auth/FondoAnimado'

export const metadata = {
  title: 'Iniciar sesión — Skeilab',
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <FondoAnimado />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(1100px 620px at 22% 32%, var(--gold-15), transparent 60%)' }}
      />

      <div className="absolute top-6 left-6 sm:top-8 sm:left-10 z-20 flex items-center gap-3">
        <Image src="/logo.png" alt="Skeilab" width={46} height={46} className="rounded-xl" priority />
        <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>Skeilab</span>
      </div>

      <div className="absolute z-10 left-6 sm:left-10 top-1/2 -translate-y-1/2 max-w-xl pr-4 pointer-events-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: 'var(--gold)' }}>
          OnlyFans Management
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-[1.1]" style={{ color: 'var(--foreground)' }}>
          El primer software del mundo de OFM para{' '}
          <span style={{ color: 'var(--gold)' }}>analizar a tu competencia</span>.
        </h1>
      </div>

      <div className="absolute z-20 inset-x-4 bottom-6 sm:inset-x-auto sm:right-8 sm:bottom-8 sm:w-[380px]">
        <div className="rounded-2xl p-7 shadow-2xl border backdrop-blur-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
            Acceso al equipo
          </h2>
          <LoginForm />
        </div>
        <p className="text-center text-[11px] mt-4" style={{ color: 'var(--muted)' }}>
          INVY Marketing FZE LLC · Ajman Free Zone, Dubai UAE
        </p>
      </div>
    </div>
  )
}
