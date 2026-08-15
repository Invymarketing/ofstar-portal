// components/modulo-2/analytics-utils.ts

export interface Nicho { id: string; nombre: string; color: string }
export interface Metrica { fecha: string; seguidores: number; siguiendo: number; engagement_rate: number }
export interface Reel { url: string; thumbnail_url: string | null; caption: string; views: number; likes: number; comentarios: number; ratio_vl: number; fecha_publicacion: string | null }
export interface ModeloRef { id: string; full_name: string; model_name: string | null }
export interface Cuenta {
  id: string; tipo: string; ig_username: string
  modelo_id: string | null; grupo_competencia: string | null; es_principal: boolean
  full_name: string | null; profile_pic_url: string | null
  notas: string | null; activa: boolean; ultima_sync: string | null
  nichos: Nicho | null; modelos: ModeloRef | null
  metricas_analytics: Metrica[]; reels_analytics: Reel[]
}

// Un "grupo" = una modelo (propias) o un competidor (competencia)
export interface Grupo {
  key: string              // modelo_id o grupo_competencia
  nombre: string
  nicho: Nicho | null
  profilePic: string | null
  cuentas: Cuenta[]
  totalSeguidores: number
  engagementMedio: number
  totalCuentas: number
}

export function formatNum(n: number): string {
  if (n == null) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

export function ultimaMetrica(c: Cuenta): Metrica | null {
  const s = [...(c.metricas_analytics ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha))
  return s[0] ?? null
}

// Agrupa las cuentas en "carpetas" (por modelo o por grupo de competencia)
export function agruparCuentas(cuentas: Cuenta[], tipo: 'propia' | 'competencia'): Grupo[] {
  const mapa = new Map<string, Cuenta[]>()

  for (const c of cuentas) {
    let key: string
    if (tipo === 'propia') {
      key = c.modelo_id || `sin-modelo-${c.id}` // cuentas sin modelo van solas
    } else {
      key = c.grupo_competencia || `sin-grupo-${c.id}`
    }
    if (!mapa.has(key)) mapa.set(key, [])
    mapa.get(key)!.push(c)
  }

  const grupos: Grupo[] = []
  for (const [key, lista] of mapa.entries()) {
    const principal = lista.find(c => c.es_principal) || lista[0]
    const nombre = tipo === 'propia'
      ? (principal.modelos?.model_name || principal.modelos?.full_name || principal.ig_username)
      : (principal.grupo_competencia || principal.full_name || principal.ig_username)

    const totalSeguidores = lista.reduce((a, c) => a + (ultimaMetrica(c)?.seguidores ?? 0), 0)
    const engs = lista.map(c => ultimaMetrica(c)?.engagement_rate).filter(Boolean) as number[]
    const engagementMedio = engs.length ? Number((engs.reduce((a, b) => a + b, 0) / engs.length).toFixed(1)) : 0

    grupos.push({
      key,
      nombre,
      nicho: principal.nichos,
      profilePic: principal.profile_pic_url,
      cuentas: lista,
      totalSeguidores,
      engagementMedio,
      totalCuentas: lista.length,
    })
  }

  // Ordenar por total de seguidores desc
  grupos.sort((a, b) => b.totalSeguidores - a.totalSeguidores)
  return grupos
}
