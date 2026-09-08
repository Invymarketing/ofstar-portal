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
        style={{ background: 'radial-gradient(1100px 640px at 50% 24%, var(--gold-15), transparent 60%)' }}
      />

      {/* Logo centrado + eslogan */}
      <div className="absolute z-10 inset-x-0 top-[14%] flex flex-col items-center text-center px-6 pointer-events-none">
        <Image src="/logo.png" alt="Skeilab" width={132} height={132} className="rounded-3xl mb-5 shadow-2xl" priority />
        <span className="text-4xl sm:text-5xl font-bold tracking-tight mb-5" style={{ color: 'var(--foreground)' }}>Skeilab</span>
        <h1 className="text-xl sm:text-3xl font-bold max-w-3xl leading-snug" style={{ color: 'var(--foreground)' }}>
          El primer software del mundo de OFM que{' '}
          <span style={{ color: 'var(--gold)' }}>analiza a tu competencia</span> y{' '}
          <span style={{ color: 'var(--gold)' }}>centraliza tu agencia</span>.
        </h1>
      </div>

      {/* Caja de login abajo a la derecha */}
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
