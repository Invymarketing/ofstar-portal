// lib/anthropic.ts — genera los mensajes con Claude (mismos prompts del bot de Make)
const API = 'https://api.anthropic.com/v1/messages'
const KEY = process.env.ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5'

const TEMAS_MANANA = [
  'deséales un buen día', 'pregúntales cómo amanecieron', 'diles que acabas de despertar',
  'diles que pasas solo a saludar', 'mándales un besito de buenos días', 'diles que te acordaste de ellos',
  'deséales que tengan un súper día', 'salúdalos con energía de mañana',
]
const TEMAS_CTA = [
  'estoy aburrida y peligrosa', 'acabo de salir de la ducha', 'sigo en la cama sin ganas de levantarme',
  'tengo un antojo que no puedo ignorar', 'me siento muy traviesa', 'no consigo dormir', 'me muero de calor',
  'guardo algo que nadie ha visto todavía', 'estoy esperando a alguien con quien jugar', 'hoy ando muy mimosa',
  'me han entrado ganas de hacer locuras', 'estoy sola en casa y me aburro',
]
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
const seed = () => Math.floor(Math.random() * 9999)

async function claude(prompt: string): Promise<string> {
  if (!KEY) throw new Error('Falta ANTHROPIC_API_KEY')
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 120, messages: [{ role: 'user', content: prompt }] }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${data?.error?.message || 'error'}`)
  return (data?.content?.[0]?.text ?? '').trim()
}

export function generarBuenosDias(): Promise<string> {
  const prompt = `Escribe UN mensaje de buenos días para el canal de Telegram de una modelo. Debe ser SIMPLE, corto y natural, como un saludo de verdad (NO coqueto, NO sexual). Enfoque de hoy: ${pick(TEMAS_MANANA)}. Seed: ${seed()}. Reglas: máximo 1 frase corta (8 a 14 palabras), varía SIEMPRE el inicio, NUNCA empieces con 'Me desperté' ni uses 'sonrisa tonta'. Ejemplos del estilo simple que quiero (imítalos, NO los copies): 'Buenos días, que tengáis un súper día☀️' / 'Acabo de despertar, ¿cómo amanecéis?😊' / 'Paso por aquí a saludaros, buenos días💙' / 'Buenos días, os mando un besito para empezar el día😘' / 'Holaa, buenos días, ¿qué tal la noche?☀️'. 1 emoji al final como mucho (☀️💙😊😘🥱). Sin link, sin foto, sin explicaciones, sin comillas.`
  return claude(prompt)
}

export function generarCTA(): Promise<string> {
  const prompt = `Escribe UN CTA breve y ORIGINAL para el canal de Telegram de una modelo, invitando a escribirle o entrar a su contenido. Pártelo SIEMPRE de esta situación concreta de hoy: '${pick(TEMAS_CTA)}'. Seed: ${seed()}. MUY IMPORTANTE: varía SIEMPRE el inicio y la estructura; está PROHIBIDO empezar con la palabra "Te atreves" o usar la palabra "descubrir". Cambia el verbo y el gancho en cada mensaje, nunca repitas fórmula. Tono coqueto y juguetón pero NO explícito, español de España, máximo 1 frase corta terminada en pregunta o invitación. Ejemplos SOLO de tono (NUNCA los copies literalmente): 'Me aburro y eso es peligroso...vienes a hacerme compañía?😈' / 'Acabo de salir de la ducha y no sé qué ponerme...me ayudas a elegir?🫣' / 'No tengo sueño, ¿jugamos un rato?😏' / 'Estoy muy mimosa hoy, ¿quién me hace caso?💙'. 1-2 emojis de estos: 😳💙😏🔥😈🫣🤭. Sin explicaciones, sin comillas.`
  return claude(prompt)
}
