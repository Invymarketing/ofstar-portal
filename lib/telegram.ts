// lib/telegram.ts
// Envío a Telegram usando el Bot API. Necesita TELEGRAM_BOT_TOKEN (de @BotFather).
const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const BASE = () => `https://api.telegram.org/bot${TOKEN}`

async function call(method: string, body: Record<string, unknown>) {
  if (!TOKEN) throw new Error('Falta TELEGRAM_BOT_TOKEN en las variables de entorno')
  const res = await fetch(`${BASE()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || res.status}`)
  return data.result
}

export function sendText(chatId: string, text: string) {
  return call('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true })
}
export function sendPhoto(chatId: string, url: string, caption?: string) {
  return call('sendPhoto', { chat_id: chatId, photo: url, caption: caption || undefined })
}
export function sendVideo(chatId: string, url: string, caption?: string) {
  return call('sendVideo', { chat_id: chatId, video: url, caption: caption || undefined })
}

// Envía según el tipo del mensaje
export async function enviarMensaje(
  chatId: string,
  tipo: string,
  texto: string | null,
  archivoUrl: string | null
) {
  if (tipo === 'foto') {
    if (!archivoUrl) throw new Error('Falta la URL de la foto')
    return sendPhoto(chatId, archivoUrl, texto ?? undefined)
  }
  if (tipo === 'video') {
    if (!archivoUrl) throw new Error('Falta la URL del video')
    return sendVideo(chatId, archivoUrl, texto ?? undefined)
  }
  // texto por defecto
  if (!texto || !texto.trim()) throw new Error('El texto está vacío')
  return sendText(chatId, texto)
}
