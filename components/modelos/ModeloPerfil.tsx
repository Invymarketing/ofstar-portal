'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Users, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface PuntoSerie { fecha: string; seguidores: number; engagement: number }
interface CuentaResumen { id: string; ig_username: string; profile_pic_url: string | null; es_principal: boolean }

export default function ModeloPerfil({ modeloId, nombre, foto, onBack }: {
  modeloId: string; nombre: string; foto: string | null; onBack: () => void
}) {
  const [serie, setSerie] = useState<PuntoSerie[]>([])
  const [cuentas, setCuentas] = useState<CuentaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<number>(0) // 0 = todo

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/modelos/${modeloId}/metricas`)
        const data = await res.json()
        if (!vivo) return
        setSerie(data.serie ?? [])
        setCuentas(data.cuentas ?? [])
      } catch {
        if (vivo) { setSerie([]); setCuentas([]) }
      }
      if (vivo) setLoading(false)
    })()
    return () => { vivo = false }
  }, [modeloId])

  const serieFiltrada = (() => {
    if (periodo === 0) return serie
    const corte = new Date()
    corte.setDate(corte.getDate() - periodo)
    const min = corte.toISOString().split('T')[0]
    const f = serie.filter(p => p.fecha >= min)
    return f.length > 0 ? f : serie
  })()
  const ultimo = serieFiltrada[serieFiltrada.length - 1]
  const primero = serieFiltrada[0]
  const crecimiento = ultimo && primero ? ultimo.seguidores - primero.seguidores : 0

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-5 px-3 py-1.5 rounded-lg" style={{ color: '#8B8B9E', backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
        <ArrowLeft size={14} /> Volver a modelos
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold" style={{ backgroundColor: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
          {foto ? <img src={foto} alt={nombre} className="w-full h-full object-cover" /> : nombre[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0F0F5' }}>{nombre}</h1>
          <p className="text-sm" style={{ color: '#8B8B9E' }}>{cuentas.length} cuenta{cuentas.length === 1 ? '' : 's'} vinculada{cuentas.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: '#8B8B9E' }} /></div>
      )}

      {!loading && serie.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: '#13131A', border: '1px dashed #1E1E2E' }}>
          <p className="text-sm" style={{ color: '#F0F0F5' }}>Aún no hay datos de métricas para esta modelo.</p>
          <p className="text-xs mt-1.5" style={{ color: '#8B8B9E' }}>Vincula una cuenta en Analytics y sincronízala; la curva empezará a acumular desde hoy.</p>
        </div>
      )}

      {!loading && serie.length > 0 && (
        <>
          <div className="flex gap-2 mb-4">
            {[{l:'7d',v:7},{l:'14d',v:14},{l:'30d',v:30},{l:'Todo',v:0}].map(o => (
              <button key={o.v} onClick={() => setPeriodo(o.v)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: periodo === o.v ? 'rgba(201,168,76,0.15)' : '#13131A', color: periodo === o.v ? '#C9A84C' : '#8B8B9E', border: periodo === o.v ? '1px solid rgba(201,168,76,0.3)' : '1px solid #1E1E2E' }}>{o.l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
              <div className="flex items-center gap-2 mb-1" style={{ color: '#8B8B9E' }}><Users size={14} /><span className="text-xs">Seguidores</span></div>
              <p className="text-2xl font-bold" style={{ color: '#F0F0F5' }}>{ultimo.seguidores.toLocaleString('es-ES')}</p>
              {serie.length > 1 && (
                <p className="text-xs mt-0.5" style={{ color: crecimiento >= 0 ? '#4ADE80' : '#F87171' }}>{crecimiento >= 0 ? '+' : ''}{crecimiento.toLocaleString('es-ES')} desde el inicio</p>
              )}
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
              <div className="flex items-center gap-2 mb-1" style={{ color: '#8B8B9E' }}><TrendingUp size={14} /><span className="text-xs">Engagement</span></div>
              <p className="text-2xl font-bold" style={{ color: '#F0F0F5' }}>{ultimo.engagement}%</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: '#F0F0F5' }}>Crecimiento de seguidores</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={serieFiltrada} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
                <XAxis dataKey="fecha" tick={{ fill: '#8B8B9E', fontSize: 11 }} tickFormatter={fmtFecha} />
                <YAxis tick={{ fill: '#8B8B9E', fontSize: 11 }} width={44} tickFormatter={(v: any) => fmtNum(v)} />
                <Tooltip contentStyle={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', borderRadius: 12, color: '#F0F0F5' }} labelFormatter={fmtFecha} formatter={(v: any) => [Number(v).toLocaleString('es-ES'), 'Seguidores']} />
                <Line type="monotone" dataKey="seguidores" stroke="#C9A84C" strokeWidth={2} dot={{ r: 3, fill: '#C9A84C' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: '#F0F0F5' }}>Evolución del engagement</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={serieFiltrada} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
                <XAxis dataKey="fecha" tick={{ fill: '#8B8B9E', fontSize: 11 }} tickFormatter={fmtFecha} />
                <YAxis tick={{ fill: '#8B8B9E', fontSize: 11 }} width={44} tickFormatter={(v: any) => v + '%'} />
                <Tooltip contentStyle={{ backgroundColor: '#0D0D14', border: '1px solid #1E1E2E', borderRadius: 12, color: '#F0F0F5' }} labelFormatter={fmtFecha} formatter={(v: any) => [v + '%', 'Engagement']} />
                <Line type="monotone" dataKey="engagement" stroke="#60A5FA" strokeWidth={2} dot={{ r: 3, fill: '#60A5FA' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

function fmtFecha(f: any): string {
  if (!f || typeof f !== 'string') return String(f ?? '')
  const p = f.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}` : f
}
function fmtNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}
