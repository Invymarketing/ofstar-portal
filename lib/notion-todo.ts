// lib/notion-todo.ts — lee el TO-DO de una modelo y extrae sus tareas
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

export interface TareaTodo {
  texto: string
  objetivo: number | null      // nº pedido (primer número del texto), null si no tiene
  driveFolderId: string | null // carpeta de Drive enlazada (SUBIR), null si no hay
}

const primerNumero = (t: string): number | null => {
  const m = t.match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}
const folderId = (u: string): string | null => {
  const m = u.match(/folders\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

// Devuelve el título de una página de Notion (busca la propiedad de tipo title)
function tituloDePagina(p: any): string {
  const props = p?.properties || {}
  for (const k of Object.keys(props)) {
    const v = props[k]
    if (v?.type === 'title') {
      return (v.title || []).map((t: any) => t.plain_text).join('').trim()
    }
  }
  return ''
}

// Normaliza texto para comparar: minúsculas, sin acentos, sin espacios de más
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

// Busca la página del TO-DO de una modelo.
// 1) Si la ficha tiene notion_url con id → se usa ese id directo.
// 2) Si no, busca entre TODAS las páginas una cuyo título EMPIECE por "to-do" (o "to do")
//    Y contenga el nombre de la modelo. Si no hay ninguna así → null (nunca agarra otra).
export async function encontrarTodoPageId(nombre: string, notionUrl: string | null): Promise<string | null> {
  if (notionUrl) {
    const m = notionUrl.match(/([a-f0-9]{32})/i)
    if (m) return m[1]
  }

  const objetivo = norm(nombre)
  if (!objetivo) return null

  // Recorremos todas las páginas que ve la integración (paginado)
  let cursor: string | undefined = undefined
  const candidatas: { id: string; titulo: string }[] = []
  do {
    const res: any = await notion.search({
      page_size: 100,
      start_cursor: cursor,
      filter: { property: 'object', value: 'page' },
    })
    for (const p of res.results) {
      const titulo = tituloDePagina(p)
      const t = norm(titulo)
      // Debe ser una página de TO-DO (empieza por "to-do" o "to do") y mencionar a la modelo
      const esTodo = t.startsWith('to-do') || t.startsWith('to do')
      if (esTodo && t.includes(objetivo)) {
        candidatas.push({ id: p.id, titulo })
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)

  if (candidatas.length === 0) return null

  // Si hay varias, preferimos la coincidencia más exacta (título más corto = menos ruido)
  candidatas.sort((a, b) => a.titulo.length - b.titulo.length)
  return candidatas[0].id
}

// Lee todos los bloques de la página y arma la lista de tareas
export async function leerTareas(pageId: string): Promise<TareaTodo[]> {
  const tareas: TareaTodo[] = []
  let cursor: string | undefined = undefined
  let actual: TareaTodo | null = null

  do {
    const res: any = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 })
    for (const b of res.results) {
      if (b.type === 'to_do') {
        // cerrar la tarea anterior (aunque no tuviera carpeta)
        if (actual) tareas.push(actual)
        const texto = (b.to_do.rich_text || []).map((t: any) => t.plain_text).join('').trim()
        actual = { texto, objetivo: primerNumero(texto), driveFolderId: null }
      } else if (actual) {
        // buscar un enlace a Drive en cualquier bloque hijo de la tarea (párrafo, etc.)
        const rich = b[b.type]?.rich_text || []
        const link = rich.find((t: any) => t.href && t.href.includes('drive.google.com'))
        if (link && !actual.driveFolderId) actual.driveFolderId = folderId(link.href)
      }
    }
    cursor = res.next_cursor || undefined
  } while (cursor)

  if (actual) tareas.push(actual)
  return tareas
}
