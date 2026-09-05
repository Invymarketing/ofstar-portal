'use server'

import { createClient } from '@/lib/supabase/server'

const API = 'https://api.anthropic.com/v1/messages'
const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'

const NIVELES: Record<string, string> = {
  suave: 'Toque español ligero: cambia lo esencial pero mantén un registro neutro-natural.',
  medio: 'Español de España claro y coloquial, con expresiones de la calle pero sin pasarte.',
  maximo: 'MUY castizo y españolete al máximo: llena el texto de jerga peninsular juvenil (tío/tía, guay, mola, flipar, en plan, qué fuerte, chaval, majo, vale, tela, currar). Que suene 100% de Madrid.',
}

function systemPrompt(nivel: string): string {
  return `Eres un traductor de estilo. Reescribes mensajes escritos en español latino y los conviertes a ESPAÑOL DE ESPAÑA (peninsular), con un tono JUVENIL y coloquial.

Reglas:
- Mantén EXACTAMENTE el significado, la intención y el tono emocional del original (si es coqueto, sigue coqueto; si es cariñoso, sigue cariñoso).
- Usa "vosotros" en vez de "ustedes" cuando aplique, y conjuga en consecuencia.
- Cambia americanismos por su equivalente español: lindo→mono/majo, bonito→guapo, chévere/bacano→guay/genial, plata→pasta, carro→coche, celular→móvil, computador→ordenador, ¿cómo estás?→¿qué tal?/¿qué pasa?, amigo→tío/colega, etc.
- Incorpora muletillas y jerga peninsular juvenil de forma natural: tío/tía, guapo/guapa, guay, mola, en plan, qué fuerte, vale, chaval, majo, flipar, currar, tela.
- NO cambies nombres propios, @usuarios, enlaces, ni emojis.
- NO añadas comillas ni explicaciones. Devuelve SOLO el texto reescrito.

Intensidad para este texto: ${NIVELES[nivel] ?? NIVELES.medio}`
}

export async function espanolizar(texto: string, nivel: string = 'medio'): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const limpio = (texto ?? '').trim()
  if (!limpio) throw new Error('Escribe algo para convertir')
  if (limpio.length > 4000) throw new Error('Máximo 4000 caracteres')
  if (!KEY) throw new Error('Falta configurar ANTHROPIC_API_KEY en el servidor')

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.8,
      system: systemPrompt(nivel),
      messages: [{ role: 'user', content: limpio }],
    }),
    cache: 'no-store',
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${data?.error?.message || 'error'}`)

  const out = (data?.content?.[0]?.text ?? '').trim()
  if (!out) throw new Error('El motor no devolvió texto')
  return out
}
