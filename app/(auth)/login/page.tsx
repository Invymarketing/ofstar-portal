import Image from 'next/image'
import LoginForm from '@/components/auth/LoginForm'
import FondoAnimado from '@/components/auth/FondoAnimado'

export const metadata = {
  title: 'Iniciar sesión — Skeilab',
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <FondoAnimado />

      {/* Resplandor verde: núcleo intenso + halo amplio */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(680px 460px at 50% 14%, var(--gold-25), transparent 60%), radial-gradient(1500px 950px at 50% 10%, var(--gold-15), transparent 72%)',
        }}
      />

      {/* Contenido centrado */}
      <div className="relative z-10 min-h-screen w-full flex flex-col items-center text-center px-6 pt-[7vh] sm:pt-[8vh] pb-12">
        <Image src="/logo.png" alt="Skeilab" width={148} height={148} className="rounded-3xl mb-5 shadow-2xl" priority />
        <span className="text-4xl sm:text-5xl font-bold tracking-tight mb-5" style={{ color: 'var(--foreground)' }}>Skeilab</span>
        <h1 className="text-xl sm:text-3xl font-bold max-w-3xl leading-snug mb-9" style={{ color: 'var(--foreground)' }}>
          El primer software del mundo de OFM que{' '}
          <span style={{ color: 'var(--gold)' }}>analiza a tu competencia</span> y{' '}
          <span style={{ color: 'var(--gold)' }}>centraliza tu agencia</span>.
        </h1>

        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-7 shadow-2xl border backdrop-blur-sm text-left" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
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
    </div>
  )
}
