'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ActualizarPasswordPage() {
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const router = useRouter()

  const inputClass = `
    w-full bg-background border border-border rounded-xl
    pl-10 pr-11 py-3 text-sm text-foreground placeholder:text-muted/50
    focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20
    transition-colors
  `

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: upErr } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (upErr) {
      setError('No se pudo cambiar la contraseña. Vuelve a abrir el enlace del correo (puede haber caducado).')
      return
    }
    setOk(true)
    setTimeout(() => { router.push('/'); router.refresh() }, 1600)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--background)' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(1000px 560px at 50% 30%, var(--gold-15), transparent 60%)' }}
      />
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo.png" alt="Skeilab" width={64} height={64} className="rounded-2xl mb-3" priority />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>Nueva contraseña</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Crea tu nueva contraseña de acceso</p>
        </div>

        <div className="rounded-2xl p-7 shadow-2xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          {ok ? (
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#22C55E' }} />
              <p className="text-sm" style={{ color: 'var(--foreground)' }}>Contraseña cambiada. Entrando…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">Nueva contraseña</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"><Lock size={15} /></div>
                  <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" className={inputClass} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">Repite la contraseña</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"><Lock size={15} /></div>
                  <input type={show ? 'text' : 'password'} value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" required autoComplete="new-password" className={inputClass} />
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
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
