'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Eye, Heart, Loader2, Film, ExternalLink, Trophy, Swords, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import AddCuentaModal from '@/components/modulo-2/AddCuentaModal'

interface ReelRef {
  url: string; thumbnail_url: string | null; caption: string
  views: number; likes: number; comentarios: number; ratio_vl: number
  fecha_publicacion: string | null; ig_username: string; grupo: string
  modelos_ref: { id: string; nombre: string }[]
}

interface CuentaComp {
  id: string; ig_username: string; grupo_competencia: string | null
  profile_pic_url: string | null; full_name: string | null; es_principal?: boolean
}

// Un "competidor" agrupa las cuentas que comparten grupo_competencia
interface Competidor { nombre: string; cuentaIds: string[]; usernames: string[]; pic: string | null }

const COLOR = 'var(--gold)'
function formatNum(n: number): string {
  if (n == null) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}
function score(r: ReelRef): number { return r.views + r.likes * 50 + r.comentarios * 100 }

// Agrupa una lista de cuentas de competencia en competidores (por nombre de grupo)
function agrupar(cuentas: CuentaComp[]): Competidor[] {
  const mapa = new Map<string, Competidor>()
  for (const c of cuentas) {
    const nombre = c.grupo_competencia || c.full_name || c.ig_username
    const g = mapa.get(nombre) ?? { nombre, cuentaIds: [], usernames: [], pic: null }
    g.cuentaIds.push(c.id)
    if (c.ig_username) g.usernames.push(c.ig_username)
    if (!g.pic && c.profile_pic_url) g.pic = c.profile_pic_url
    mapa.set(nombre, g)
  }
  return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export default function CompetenciaModelo({ modeloId, nombreModelo }: { modeloId: string; nombreModelo?: string }) {
  const [reels, setReels] = useState<ReelRef[]>([])
  const [vinculados, setVinculados] = useState<CuentaComp[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<number>(30)
  const [orden, setOrden] = useState<'mejores' | 'vistos' | 'engagement' | 'recientes'>('mejores')

  const [expandido, setExpandido] = useState<string | null>(null)  // competidor abierto
  const [busy, setBusy] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [rReels, rVinc] = await Promise.all([
        fetch('/api/reels?tipo=competencia').then(r => r.json()).catch(() => ({})),
        fetch(`/api/competencia-modelos?modelo_id=${modeloId}`).then(r => r.json()).catch(() => ({})),
      ])
      setReels(((rReels.reels ?? []) as ReelRef[]).filter(x => (x.modelos_ref || []).some(m => m.id === modeloId)))
      setVinculados((rVinc.cuentas ?? []) as CuentaComp[])
    } catch { /* noop */ }
    setLoading(false)
  }, [modeloId])

  useEffect(() => { cargar() }, [cargar])

  const competidores = useMemo(() => agrupar(vinculados), [vinculados])

  async function quitar(comp: Competidor) {
    if (!confirm(`¿Quitar «${comp.nombre}» de la competencia de esta modelo?`)) return
    setBusy(comp.nombre)
    try {
      await fetch('/api/competencia-modelos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelo_id: modeloId, cuenta_ids: comp.cuentaIds, op: 'unlink' }),
      })
      await cargar()
    } catch { /* noop */ }
    setBusy(null)
  }

  // Reels de un competidor, ya filtrados por periodo y ordenados
  function reelsDe(comp: Competidor): ReelRef[] {
    let lista = reels.filter(r => r.grupo === comp.nombre)
    if (periodo !== 9999) {
      const limite = new Date(); limite.setDate(limite.getDate() - periodo)
      lista = lista.filter(r => r.fecha_publicacion && new Date(r.fecha_publicacion) >= limite)
    }
    const arr = [...lista]
    if (orden === 'vistos') arr.sort((a, b) => b.views - a.views)
    else if (orden === 'engagement') arr.sort((a, b) => (b.likes + b.comentarios) - (a.likes + a.comentarios))
    else if (orden === 'recientes') arr.sort((a, b) => (b.fecha_publicacion ?? '').localeCompare(a.fecha_publicacion ?? ''))
    else arr.sort((a, b) => score(b) - score(a))
    return arr
  }

  const chip = (activo: boolean) => ({
    backgroundColor: activo ? 'var(--gold-15)' : 'var(--field)',
    color: activo ? COLOR : 'var(--muted)',
    border: activo ? '1px solid var(--gold-25)' : '1px solid var(--border)',
  }) as const

  const titulo = nombreModelo ? `Competencia de ${nombreModelo}` : 'Competencia de la modelo'

  return (
    <div>
      {/* Cabecera + botón añadir */}
      <div className="flex items-center gap-2 mb-4">
        <Swords size={16} style={{ color: COLOR }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{titulo}</p>
        <span className="text-xs hidden sm:inline" style={{ color: 'var(--muted)' }}>· competidores y sus mejores reels</span>
        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ backgroundColor: 'var(--gold-15)', color: COLOR, border: '1px solid var(--gold-25)' }}
        >
          <Plus size={13} /> Añadir competidor
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: 'var(--muted)' }} /></div>}

      {!loading && competidores.length === 0 && (
        <div className="text-center py-14 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)' }}>
          <Swords size={22} className="mx-auto mb-2" style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Esta modelo no tiene competencia asignada todavía.</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--gold-15)', border: '1px solid var(--gold-25)', color: COLOR }}>Añadir el primer competidor</button>
        </div>
      )}

      {/* Lista de competidores plegables (estilo cuentas propias) */}
      {!loading && competidores.length > 0 && (
        <div className="space-y-3">
          {competidores.map(comp => {
            const abierto = expandido === comp.nombre
            const lista = abierto ? reelsDe(comp) : []
            const media = lista.length ? lista.map(score).reduce((a, b) => a + b, 0) / lista.length : 0
            const sub = comp.usernames.length > 1 ? `${comp.usernames.length} cuentas` : (comp.usernames[0] ? '@' + comp.usernames[0] : '')

            return (
              <div key={comp.nombre} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                {/* Cabecera del competidor */}
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--border)' }}>
                    {comp.pic ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={comp.pic} alt={comp.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: 'var(--muted)' }}>{comp.nombre[0]?.toUpperCase()}</div>
                    )}
                  </div>
                  <button onClick={() => setExpandido(abierto ? null : comp.nombre)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{comp.nombre}</p>
                    {sub && <p className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>}
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => quitar(comp)} disabled={busy === comp.nombre} title={`Quitar ${comp.nombre}`} style={{ color: 'var(--muted)' }} className="p-1.5 rounded-lg hover:bg-[var(--hover)] hover:text-red-400">
                      {busy === comp.nombre ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
                    </button>
                    <button onClick={() => setExpandido(abierto ? null : comp.nombre)} style={{ color: 'var(--muted)' }} className="p-1.5">{abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                  </div>
                </div>

                {/* Contenido desplegable: filtros + reels de ESTE competidor */}
                {abierto && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="pt-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>Periodo:</span>
                        {([[7, '7 días'], [14, '14 días'], [30, '30 días'], [9999, 'Todo']] as const).map(([v, label]) => (
                          <button key={v} onClick={() => setPeriodo(v)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={chip(periodo === v)}>{label}</button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>Ordenar:</span>
                        {([['mejores', 'Mejores'], ['vistos', 'Más vistos'], ['engagement', 'Más engagement'], ['recientes', 'Más recientes']] as const).map(([v, label]) => (
                          <button key={v} onClick={() => setOrden(v)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all" style={chip(orden === v)}>{label}</button>
                        ))}
                      </div>

                      {lista.length === 0 ? (
                        <div className="text-center py-6 rounded-xl" style={{ backgroundColor: 'var(--field)', border: '1px dashed var(--border)' }}>
                          <Film size={18} className="mx-auto mb-2" style={{ color: 'var(--muted)' }} />
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>Sin reels en este periodo. Prueba con &quot;Todo&quot;.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {lista.slice(0, 24).map((reel, i) => {
                            const recomendado = score(reel) > media
                            return (
                              <a key={i} href={reel.url} target="_blank" rel="noopener noreferrer" className="group rounded-xl overflow-hidden transition-all" style={{ border: recomendado ? `1.5px solid ${COLOR}` : '1px solid var(--border)', backgroundColor: 'var(--field)' }}>
                                <div className="relative w-full" style={{ aspectRatio: '9/16', backgroundColor: 'var(--border)' }}>
                                  {reel.thumbnail_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Film size={20} style={{ color: 'var(--muted)' }} /></div>
                                  )}
                                  {recomendado && (
                                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${COLOR}ee` }}>
                                      <Trophy size={8} style={{ color: '#0D0D14' }} /><span className="text-[8px] font-bold" style={{ color: '#0D0D14' }}>TOP</span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                                    <ExternalLink size={18} style={{ color: '#fff' }} />
                                  </div>
                                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
                                    <Eye size={9} style={{ color: '#fff' }} /><span className="text-[9px] font-bold" style={{ color: '#fff' }}>{formatNum(reel.views)}</span>
                                  </div>
                                </div>
                                <div className="p-1.5">
                                  <p className="text-[9px] font-medium truncate" style={{ color: 'var(--muted)' }}>@{reel.ig_username}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="flex items-center gap-0.5"><Heart size={8} style={{ color: 'var(--muted)' }} /><span className="text-[9px]" style={{ color: 'var(--foreground)' }}>{formatNum(reel.likes)}</span></div>
                                    <span className="text-[9px] font-semibold ml-auto" style={{ color: COLOR }}>{reel.ratio_vl?.toFixed(0)}x</span>
                                  </div>
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddCuentaModal
          tipo="competencia"
          modeloPreseleccionado={modeloId}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); cargar() }}
        />
      )}
    </div>
  )
}
