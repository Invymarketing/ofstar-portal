'use client'

import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [modo, setModo] = useState<'login' | 'olvide'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const router = useRouter()

  const inputClass = `
    w-full bg-background border border-border rounded-xl
    pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted/50
    focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20
    transition-colors
  `

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email o contraseña incorrectos. Inténtalo de nuevo.')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/actualizar-password`,
    })
    setLoading(false)
    if (resetError) {
      setError('No se pudo enviar el correo. Inténtalo de nuevo en un momento.')
      return
    }
    setEnviado(true)
  }

  if (modo === 'olvide') {
    return (
      <div className="space-y-4">
        {enviado ? (
          <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#22C55E' }} />
            <p className="text-xs" style={{ color: 'var(--foreground)' }}>
              Si ese correo tiene una cuenta, te hemos enviado un enlace para restablecer la contraseña. Revisa tu bandeja (y el spam).
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Escribe tu email y te enviaremos un enlace para crear una contraseña nueva.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wider">Email</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"><Mail size={15} /></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required autoComplete="email" className={inputClass} />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="text-danger flex-shrink-0 mt-0.5" />
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-background font-semibold py-3 px-4 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]">
              {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}

        <button type="button" onClick={() => { setModo('login'); setError(null); setEnviado(false) }}
          className="flex items-center gap-1.5 mx-auto text-xs text-muted hover:text-foreground transition-colors">
          <ArrowLeft size={13} /> Volver a iniciar sesión
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted uppercase tracking-wider">Email</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"><Mail size={15} /></div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required autoComplete="email" className={inputClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted uppercase tracking-wider">Contraseña</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"><Lock size={15} /></div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className={inputClass + ' pr-11'}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full bg-gold hover:bg-gold-light text-background font-semibold py-3 px-4 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            Iniciando sesión...
          </span>
        ) : 'Iniciar sesión'}
      </button>

      <button type="button" onClick={() => { setModo('olvide'); setError(null) }}
        className="block mx-auto text-xs text-muted hover:text-foreground transition-colors">
        ¿Has olvidado tu contraseña?
      </button>
    </form>
  )
}
