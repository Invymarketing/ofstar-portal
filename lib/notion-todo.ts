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

// Busca la página del TO-DO de una modelo: primero por URL de la ficha, si no por nombre
export async function encontrarTodoPageId(nombre: string, notionUrl: string | null): Promise<string | null> {
  if (notionUrl) {
    const m = notionUrl.match(/([a-f0-9]{32})/i)
    if (m) return m[1]
  }
  const res: any = await notion.search({ query: `TO-DO List ${nombre}`, page_size: 5 })
  const page = res.results.find((r: any) =>
    r.properties?.title?.title?.[0]?.plain_text?.toLowerCase().includes(nombre.toLowerCase())
  ) || res.results[0]
  return page?.id || null
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
