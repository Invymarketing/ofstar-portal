// lib/hikerapi.ts
const BASE = 'https://api.hikerapi.com'
const API_KEY = process.env.HIKERAPI_KEY

interface HikerUser {
  pk: string; username: string; full_name: string
  is_private: boolean; is_verified: boolean
  media_count: number; follower_count: number; following_count: number
  biography: string; profile_pic_url?: string; profile_pic_url_hd?: string
}

interface HikerMedia {
  id: string; pk?: string; code: string; media_type: number
  like_count: number; comment_count: number
  play_count?: number; view_count?: number
  caption?: { text: string } | string | null; caption_text?: string
  taken_at: number | string; taken_at_ts?: number; thumbnail_url?: string
}

async function hikerFetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE + endpoint)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { headers: { 'x-access-key': API_KEY! }, cache: 'no-store' })
  if (!res.ok) throw new Error(`HikerAPI error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export async function getUserProfile(username: string): Promise<HikerUser> {
  return hikerFetch<HikerUser>('/v1/user/by/username', { username: username.replace('@', '').trim() })
}

export async function getUserMedias(userId: string, amount = 12): Promise<HikerMedia[]> {
  const r = await hikerFetch<HikerMedia[] | { items: HikerMedia[] }>('/v1/user/medias', { user_id: userId, amount: String(amount) })
  return Array.isArray(r) ? r : (r.items ?? [])
}

// REELS con paginación. El endpoint /v1/user/clips/chunk devuelve:
//   [ [ ...reels ], "cursor_o_null" ]
// Paginamos pasando el cursor como page_id hasta cubrir maxReels.
export async function getUserClips(userId: string, maxReels = 60): Promise<HikerMedia[]> {
  const todos: HikerMedia[] = []
  let cursor: string | null = null
  let intentos = 0

  while (todos.length < maxReels && intentos < 8) {
    intentos++
    const params: Record<string, string> = { user_id: userId }
    if (cursor) params.end_cursor = cursor

    let data: any
    try {
      data = await hikerFetch<any>('/v1/user/clips/chunk', params)
    } catch {
      break
    }

    // Formato esperado: [ [reels], cursor ]
    let items: HikerMedia[] = []
    let nextCursor: string | null = null

    if (Array.isArray(data)) {
      if (Array.isArray(data[0])) {
        items = data[0]
        nextCursor = typeof data[1] === 'string' ? data[1] : null
      } else {
        // por si viniera como array plano de reels
        items = data as HikerMedia[]
      }
    } else if (data && Array.isArray(data.items)) {
      items = data.items
      nextCursor = data.next_page_id || data.page_id || null
    }

    if (items.length === 0) break
    todos.push(...items)

    if (!nextCursor) break
    cursor = nextCursor
  }

  return todos.slice(0, maxReels)
}

export function calcEngagementRate(medias: HikerMedia[], followers: number): number {
  if (medias.length === 0 || followers === 0) return 0
  const total = medias.reduce((s, m) => s + (m.like_count || 0) + (m.comment_count || 0), 0)
  return Number((((total / medias.length) / followers) * 100).toFixed(2))
}

export function calcRatioVL(views: number, likes: number): number {
  return likes === 0 ? 0 : Number((views / likes).toFixed(2))
}

function extractCaption(m: HikerMedia): string {
  if (typeof m.caption === 'string') return m.caption.slice(0, 200)
  if (m.caption && typeof m.caption === 'object' && m.caption.text) return m.caption.text.slice(0, 200)
  if (m.caption_text) return m.caption_text.slice(0, 200)
  return ''
}

function parseFecha(m: HikerMedia): string | null {
  if (m.taken_at_ts) return new Date(m.taken_at_ts * 1000).toISOString().split('T')[0]
  if (typeof m.taken_at === 'number') return new Date(m.taken_at * 1000).toISOString().split('T')[0]
  if (typeof m.taken_at === 'string') {
    const d = new Date(m.taken_at)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  return null
}

export function procesarReels(clips: HikerMedia[]) {
  return clips.map(m => {
    const views = m.play_count || m.view_count || 0
    return {
      ig_media_id: m.pk || m.id,
      code: m.code,
      url: `https://instagram.com/reel/${m.code}`,
      thumbnail_url: m.thumbnail_url ?? null,
      caption: extractCaption(m),
      views,
      likes: m.like_count || 0,
      comentarios: m.comment_count || 0,
      ratio_vl: calcRatioVL(views, m.like_count || 0),
      fecha_publicacion: parseFecha(m),
    }
  })
}

export type { HikerUser, HikerMedia }
