import { createClient } from '@supabase/supabase-js'
import { encontrarTodoPageId } from './lib/notion-todo.ts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: modelos } = await supabase
  .from('modelos')
  .select('id, full_name, model_name, notion_url')

console.log('Modelos:', modelos?.length, '\n')
for (const m of modelos || []) {
  const nombre = m.model_name || m.full_name
  try {
    const id = await encontrarTodoPageId(nombre, m.notion_url)
    console.log(nombre.padEnd(18), '->', id ? 'TO-DO ' + id.slice(0, 8) : 'SIN TO-DO')
  } catch (e) {
    console.log(nombre.padEnd(18), '-> ERROR:', e.message)
  }
}
