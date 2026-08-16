'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Eye, Heart, MessageCircle, Loader2, Film, ChevronDown, ExternalLink, Trophy } from 'lucide-react'

interface ReelBuscador {
  url: string
  thumbnail_url: string | null
  caption: string
  views: number
  likes: number
  comentarios: number
  ratio_vl: number
  fecha_publicacion: string | null
  ig_username: string
  modelo_id: string | null
  modelo_nombre: string
}

interface Props { tipo: 'propia' | 'competencia' }

function formatNum(n: number): string {
  if (n == null) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

type Orden = 'vistos' | 'engagement' | 'recientes'
type Periodo = 'todo' | 7 | 30

export default function BuscadorVideos({ tipo }: Props) {
  const [reels, setReels] = useState<ReelBuscador[]>([])
  const [loading, setLoading] = useState(true)
  const [orden, setOrden] = useState<Orden>('vistos')
  const [periodo, setPeriodo] = useState<Periodo>('todo')
  const [modeloFiltro, setModeloFiltro] = useState('todos')
  const [cuentaFiltro, setCuentaFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reels?tipo=${tipo}`)
      .then(r => r.json())
      .then(d => setReels(d.reels ?? []))
      .catch(() => setReels([]))
      .finally(() => setLoading(false))
  }, [tipo])

  // Listas únicas para los desplegables
  const modelos = useMemo(() => {
    const map = new Map<string, string>()
    reels.forEach(r => { if (r.modelo_nombre) map.set(r.modelo_nombre, r.modelo_nombre) })
    return Array.from(map.keys()).sort()
  }, [reels])

  const cuentas = useMemo(() => {
    const set = new Set<string>()
    reels.forEach(r => { if (r.ig_username) set.add(r.ig_username) })
    return Array.from(set).sort()
  }, [reels])

  // Aplicar filtros
  const filtrados = useMemo(() => {
    let res = [...reels]

    // Período
    if (periodo !== 'todo') {
      const limite = new Date()
      limite.setDate(limite.getDate() - periodo)
      res = res.filter(r => r.fecha_publicacion && new Date(r.fecha_publicacion) >= limite)
    }

    // Modelo
    if (modeloFiltro !== 'todos') res = res.filter(r => r.modelo_nombre === modeloFiltro)

    // Cuenta
    if (cuentaFiltro !== 'todas') res = res.filter(r => r.ig_username === cuentaFiltro)

    // Búsqueda de texto
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      res = res.filter(r => (r.caption ?? '').toLowerCase().includes(q))
    }

    // Ordenar
    if (orden === 'vistos') res.sort((a, b) => b.views - a.views)
    else if (orden === 'engagement') res.sort((a, b) => (b.likes + b.comentarios) - (a.likes + a.comentarios))
    else if (orden === 'recientes') res.sort((a, b) => (b.fecha_publicacion ?? '').localeCompare(a.fecha_publicacion ?? ''))

    return res
  }, [reels, periodo, modeloFiltro, cuentaFiltro, busqueda, orden])

  // Stats
  const stats = useMemo(() => {
    const total = filtrados.length
    const viewsTotales = filtrados.reduce((a, r) => a + (r.views || 0), 0)
    const media = total ? Math.round(viewsTotales / total) : 0
    const mejor = filtrados.reduce((m, r) => Math.max(m, r.views || 0), 0)
    return { total, viewsTotales, media, mejor }
  }, [filtrados])

  const selectStyle = { backgroundColor: '#13131A', border: '1px solid #1E1E2E', color: '#F0F0F5' }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Reels', value: stats.total.toLocaleString('es-ES') },
          { label: 'Views totales', value: formatNum(stats.viewsTotales), dorado: true },
          { label: 'Media / reel', value: formatNum(stats.media) },
          { label: 'Mejor reel', value: formatNum(stats.mejor) },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
            <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: '#8B8B9E' }}>{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.dorado ? '#C9A84C' : '#F0F0F5' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Orden */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
          {([['vistos', 'Más vistos'], ['engagement', 'Más engagement'], ['recientes', 'Más recientes']] as [Orden, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setOrden(val)} className="px-2.5 py-1 rounded-md text-xs font-medium transition-all" style={{ backgroundColor: orden === val ? 'rgba(201,168,76,0.15)' : 'transparent', color: orden === val ? '#C9A84C' : '#8B8B9E' }}>{label}</button>
          ))}
        </div>

        {/* Período */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
          {([['todo', 'Todo'], [7, '7d'], [30, '30d']] as [Periodo, string][]).map(([val, label]) => (
            <button key={String(val)} onClick={() => setPeriodo(val)} className="px-2.5 py-1 rounded-md text-xs font-medium transition-all" style={{ backgroundColor: periodo === val ? 'rgba(201,168,76,0.15)' : 'transparent', color: periodo === val ? '#C9A84C' : '#8B8B9E' }}>{label}</button>
          ))}
        </div>

        {/* Modelo (solo en propias) */}
        {tipo === 'propia' && (
          <select value={modeloFiltro} onChange={e => setModeloFiltro(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs outline-none" style={selectStyle}>
            <option value="todos">Todos los modelos</option>
            {modelos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}

        {/* Cuenta */}
        <select value={cuentaFiltro} onChange={e => setCuentaFiltro(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs outline-none" style={selectStyle}>
          <option value="todas">Todas las cuentas</option>
          {cuentas.map(c => <option key={c} value={c}>@{c}</option>)}
        </select>

        {/* Buscador */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[160px]" style={{ backgroundColor: '#13131A', border: '1px solid #1E1E2E' }}>
          <Search size={13} style={{ color: '#8B8B9E' }} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar en el texto..." className="flex-1 bg-transparent text-xs outline-none" style={{ color: '#F0F0F5' }} />
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: '#8B8B9E' }} /></div>}

      {!loading && filtrados.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: '#13131A', border: '1px dashed #1E1E2E' }}>
          <Film size={22} className="mx-auto mb-2" style={{ color: '#8B8B9E' }} />
          <p className="text-sm" style={{ color: '#8B8B9E' }}>No hay reels con estos filtros.</p>
        </div>
      )}

      {/* Cuadrícula */}
      {!loading && filtrados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtrados.slice(0, 100).map((reel, i) => (
            <a key={i} href={reel.url} target="_blank" rel="noopener noreferrer" className="group rounded-xl overflow-hidden transition-all" style={{ border: '1px solid #1E1E2E', backgroundColor: '#0D0D14' }}>
              <div className="relative w-full" style={{ aspectRatio: '9/16', backgroundColor: '#1E1E2E' }}>
                {reel.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Film size={22} style={{ color: '#8B8B9E' }} /></div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                  <ExternalLink size={18} style={{ color: '#fff' }} />
                </div>
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
                  <Eye size={10} style={{ color: '#fff' }} /><span className="text-[10px] font-bold" style={{ color: '#fff' }}>{formatNum(reel.views)}</span>
                </div>
              </div>
              <div className="p-2">
                <p className="text-[10px] font-medium truncate" style={{ color: '#C9A84C' }}>@{reel.ig_username}</p>
                {reel.caption && <p className="text-[10px] truncate mt-0.5" style={{ color: '#8B8B9E' }}>{reel.caption}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5"><Heart size={9} style={{ color: '#8B8B9E' }} /><span className="text-[10px]" style={{ color: '#F0F0F5' }}>{formatNum(reel.likes)}</span></div>
                  <div className="flex items-center gap-0.5"><MessageCircle size={9} style={{ color: '#8B8B9E' }} /><span className="text-[10px]" style={{ color: '#F0F0F5' }}>{formatNum(reel.comentarios)}</span></div>
                  <span className="text-[10px] ml-auto" style={{ color: '#8B8B9E' }}>{reel.fecha_publicacion}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
      {!loading && filtrados.length > 100 && (
        <p className="text-center text-xs mt-4" style={{ color: '#8B8B9E' }}>Mostrando los primeros 100 de {filtrados.length}. Afina los filtros para ver otros.</p>
      )}
    </div>
  )
}
