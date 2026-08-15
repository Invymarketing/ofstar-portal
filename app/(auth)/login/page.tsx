import Image from 'next/image'
import LoginForm from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Iniciar sesión — OF Star Management',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #C9A84C 0%, transparent 70%)' }}
      />

      {/* Card */}
      <div className="w-full max-w-md">
        {/* Logo section */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5">
            <Image
              src="/logo.png"
              alt="OF Star Management"
              width={88}
              height={88}
              className="rounded-2xl"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            OF Star Management
          </h1>
          <p className="text-sm text-muted mt-1">Portal de Gestión Interna</p>
        </div>

        {/* Form card */}
        <div className="bg-surface border border-border rounded-2xl p-7 shadow-2xl">
          <h2 className="text-sm font-semibold text-foreground mb-6">
            Acceso restringido al equipo
          </h2>
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted/50 mt-6">
          INVY Marketing FZE LLC · Ajman Free Zone, Dubai UAE
        </p>
      </div>
    </div>
  )
}
