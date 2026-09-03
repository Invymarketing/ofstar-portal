'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Users, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface PuntoSerie { fecha: string; seguidores: number; engagement: number }
interface CuentaResumen { id: string; ig_username: string; profile_pic_url: string | null; es_principal: boolean }

interface TareaContenido { texto: string; objetivo: number | null; entregado: number | null; tieneCarpeta: boolean; estado: string }
interface ResumenContenido { total: number; completas: number; pct: number | null }

export default function ModeloPerfil({ modeloId, nombre, foto, onBack }: {
  modeloId: string; nombre: string; foto: string | null; onBack: () => void
}) {
  const [serie, setSerie] = useState<PuntoSerie[]>([])
  const [cuentas, setCuentas] = useState<CuentaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<number>(0) // 0 = todo
  const [tareas, setTareas] = useState<TareaContenido[]>([])
  const [resumen, setResumen] = useState<ResumenContenido | null>(null)
  const [loadingCont, setLoadingCont] = useState(true)

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

  const [of, setOf] = useState<{ encontrado: boolean; entregado?: number; total?: number; porcentaje?: number; limite?: string | null } | null>(null)
  const [loadingOf, setLoadingOf] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setLoadingOf(true)
      try {
        const res = await fetch(`/api/modelos/${modeloId}/onlyfans`)
        const data = await res.json()
        if (vivo) setOf(data.encontrado ? data : null)
      } catch {
        if (vivo) setOf(null)
      }
      if (vivo) setLoadingOf(false)
    })()
    return () => { vivo = false }
  }, [modeloId])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setLoadingCont(true)
      try {
        const res = await fetch(`/api/modelos/${modeloId}/contenido`)
        const data = await res.json()
        if (!vivo) return
        // El contenido de OnlyFans se cuenta aparte (Content Snare), así que
        // ocultamos del control de Notion cualquier tarea que hable de "only".
        const tareasFiltradas = (data.tareas ?? []).filter(
          (t: any) => !/only/i.test(t.texto ?? '')
        )
        setTareas(tareasFiltradas)
        setResumen(data.resumen ?? null)
      } catch {
        if (vivo) { setTareas([]); setResumen(null) }
      }
      if (vivo) setLoadingCont(false)
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
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-5 px-3 py-1.5 rounded-lg" style={{ color: 'var(--muted)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <ArrowLeft size={14} /> Volver a modelos
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold shrink-0" style={{ backgroundColor: 'var(--gold-15)', color: 'var(--gold)' }}>
          {foto ? <img src={foto} alt={nombre} className="w-full h-full object-cover object-center" /> : nombre[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{nombre}</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{cuentas.length} cuenta{cuentas.length === 1 ? '' : 's'} vinculada{cuentas.length === 1 ? '' : 's'}</p>
        </div>
      </div>

          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Control de contenido — esta semana</p>
              {resumen && resumen.pct !== null && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{
                  backgroundColor: resumen.pct >= 100 ? 'rgba(74,222,128,0.15)' : resumen.pct >= 50 ? 'var(--gold-15)' : 'rgba(248,113,113,0.15)',
                  color: resumen.pct >= 100 ? '#4ADE80' : resumen.pct >= 50 ? 'var(--gold)' : '#F87171'
                }}>{resumen.completas}/{resumen.total} tareas · {resumen.pct}%</span>
              )}
            </div>

            {loadingCont ? (
              <div className="flex items-center justify-center py-6" style={{ color: 'var(--muted)' }}>
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : tareas.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>No se encontraron tareas para esta modelo.</p>
            ) : (
              <div className="space-y-2.5">
                {tareas.map((t, i) => {
                  const col = t.estado === 'completo' ? '#4ADE80' : t.estado === 'corta' ? '#F87171' : 'var(--muted)'
                  const pct = (t.objetivo && t.entregado != null) ? Math.min(100, Math.round((t.entregado / t.objetivo) * 100)) : 0
                  return (
                    <div key={i} className="rounded-xl p-3" style={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs pr-2" style={{ color: 'var(--foreground)' }}>{t.texto}</span>
                        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: col }}>
                          {t.objetivo != null ? `${t.entregado ?? 0}/${t.objetivo}` : (t.tieneCarpeta ? `${t.entregado ?? 0}` : '—')}
                        </span>
                      </div>
                      {t.objetivo != null && (
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                          <div className="h-full rounded-full" style={{ width: pct + '%', backgroundColor: col }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <img src="/content-snare.svg" alt="Content Snare" width={18} height={18} className="rounded" />
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Contenido OnlyFans — esta semana</p>
              </div>
              {of && of.total != null && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{
                  backgroundColor: (of.porcentaje ?? 0) >= 100 ? 'rgba(74,222,128,0.15)' : 'rgba(56,189,248,0.15)',
                  color: (of.porcentaje ?? 0) >= 100 ? '#4ADE80' : '#38BDF8'
                }}>{of.entregado}/{of.total} · {Math.round(of.porcentaje ?? 0)}%</span>
              )}
            </div>
            {loadingOf ? (
              <div className="flex items-center justify-center py-4" style={{ color: 'var(--muted)' }}><Loader2 size={16} className="animate-spin" /></div>
            ) : !of || of.total === 0 ? (
              <p className="text-sm py-3 text-center" style={{ color: 'var(--muted)' }}>No hay solicitud de Content Snare activa esta semana.</p>
            ) : (
              <div>
                <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: Math.min(100, of.porcentaje ?? 0) + '%', backgroundColor: (of.porcentaje ?? 0) >= 100 ? '#4ADE80' : '#38BDF8' }} />
                </div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {of.entregado} de {of.total} elementos entregados{of.limite ? ` · límite ${of.limite}` : ''}
                </p>
              </div>
            )}
          </div>

      {loading && (
        <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--muted)' }} /></div>
      )}

      {!loading && serie.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--foreground)' }}>Aún no hay datos de métricas para esta modelo.</p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>Vincula una cuenta en Analytics y sincronízala; la curva empezará a acumular desde hoy.</p>
        </div>
      )}

      {!loading && serie.length > 0 && (
        <>
          <div className="flex gap-2 mb-4">
            {[{l:'7d',v:7},{l:'14d',v:14},{l:'30d',v:30},{l:'Todo',v:0}].map(o => (
              <button key={o.v} onClick={() => setPeriodo(o.v)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: periodo === o.v ? 'var(--gold-15)' : 'var(--surface)', color: periodo === o.v ? 'var(--gold)' : 'var(--muted)', border: periodo === o.v ? '1px solid rgba(201,168,76,0.3)' : '1px solid var(--border)' }}>{o.l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--muted)' }}><Users size={14} /><span className="text-xs">Seguidores</span></div>
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{ultimo.seguidores.toLocaleString('es-ES')}</p>
              {serie.length > 1 && (
                <p className="text-xs mt-0.5" style={{ color: crecimiento >= 0 ? '#4ADE80' : '#F87171' }}>{crecimiento >= 0 ? '+' : ''}{crecimiento.toLocaleString('es-ES')} desde el inicio</p>
              )}
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--muted)' }}><TrendingUp size={14} /><span className="text-xs">Engagement</span></div>
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{ultimo.engagement}%</p>
            </div>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Crecimiento de seguidores</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={serieFiltrada} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={fmtFecha} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} width={44} tickFormatter={(v: any) => fmtNum(v)} />
                <Tooltip contentStyle={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--foreground)' }} labelFormatter={fmtFecha} formatter={(v: any) => [Number(v).toLocaleString('es-ES'), 'Seguidores']} />
                <Line type="monotone" dataKey="seguidores" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3, fill: 'var(--gold)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Evolución del engagement</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={serieFiltrada} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={fmtFecha} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} width={44} tickFormatter={(v: any) => v + '%'} />
                <Tooltip contentStyle={{ backgroundColor: '#0D0D14', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--foreground)' }} labelFormatter={fmtFecha} formatter={(v: any) => [v + '%', 'Engagement']} />
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
