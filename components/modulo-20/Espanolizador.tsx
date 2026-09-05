'use client'

import { useState } from 'react'
import { espanolizar } from '@/app/(dashboard)/modulo-20/actions'
import { Wand2, Copy, Check, ArrowRight, Loader2 } from 'lucide-react'

const NIVELES = [
  { v: 'suave', l: 'Suave' },
  { v: 'medio', l: 'Medio' },
  { v: 'maximo', l: 'Máximo españolete' },
]

export default function Espanolizador() {
  const [texto, setTexto] = useState('')
  const [nivel, setNivel] = useState('medio')
  const [salida, setSalida] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const card = { backgroundColor: 'var(--surface)', border: '1px solid var(--border)' } as const

  async function convertir() {
    setError(null); setCopiado(false); setCargando(true); setSalida('')
    try {
      const r = await espanolizar(texto, nivel)
      setSalida(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setCargando(false)
    }
  }

  async function copiar() {
    if (!salida) return
    await navigator.clipboard.writeText(salida)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <div className="space-y-5">
      {/* Nivel */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>Intensidad:</span>
        <div className="flex gap-1.5">
          {NIVELES.map((n) => {
            const on = nivel === n.v
            return (
              <button key={n.v} onClick={() => setNivel(n.v)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={on
                  ? { backgroundColor: 'var(--gold-15)', color: 'var(--gold)', border: '1px solid var(--gold)' }
                  : { backgroundColor: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                {n.l}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Entrada */}
        <div className="rounded-2xl p-4" style={card}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Texto original (latino)</p>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)}
            rows={9} maxLength={4000}
            placeholder="Ej: Hola, qué linda estás hoy mi amor…"
            className="w-full resize-none rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{texto.length}/4000</span>
          </div>
        </div>

        {/* Salida */}
        <div className="rounded-2xl p-4 flex flex-col" style={card}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Español de España 🇪🇸</p>
            {salida && (
              <button onClick={copiar} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--gold)' }}>
                {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>
          <div className="flex-1 rounded-lg px-3 py-2.5 text-sm whitespace-pre-wrap overflow-y-auto min-h-[180px]"
            style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: salida ? 'var(--foreground)' : 'var(--muted)' }}>
            {cargando ? 'Convirtiendo…' : (salida || 'Aquí saldrá el texto convertido.')}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={convertir} disabled={cargando || !texto.trim()}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--gold)', color: 'var(--background)' }}>
          {cargando ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {cargando ? 'Convirtiendo…' : 'Españolizar'}
          {!cargando && <ArrowRight size={15} />}
        </button>
        {error && <span className="text-xs" style={{ color: 'var(--danger)' }}>{error}</span>}
      </div>
    </div>
  )
}
