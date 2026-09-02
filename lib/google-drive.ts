// lib/google-drive.ts — cuenta/lista/descarga archivos con la cuenta de servicio
import { google } from 'googleapis'

function getDrive() {
  // Prefiere la variable nueva GOOGLE_DRIVE_JSON; si no, cae a la vieja.
  const raw = process.env.GOOGLE_DRIVE_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('Falta GOOGLE_DRIVE_JSON')
  const creds = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
}

// Cuenta archivos (no carpetas) directamente dentro de una carpeta
export async function contarArchivos(folderId: string): Promise<number> {
  const drive = getDrive()
  let total = 0
  let pageToken: string | undefined = undefined
  do {
    const res: any = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'nextPageToken, files(id)',
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
    total += (res.data.files || []).length
    pageToken = res.data.nextPageToken || undefined
  } while (pageToken)
  return total
}

export interface DriveArchivo { id: string; name: string; mimeType: string; createdTime: string }

// Lista los archivos (no carpetas) de una carpeta, ordenados por fecha de creación asc
export async function listarArchivos(folderId: string): Promise<DriveArchivo[]> {
  const drive = getDrive()
  const out: DriveArchivo[] = []
  let pageToken: string | undefined = undefined
  do {
    const res: any = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime)',
      orderBy: 'createdTime',
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
    for (const f of res.data.files || []) {
      out.push({ id: f.id, name: f.name, mimeType: f.mimeType, createdTime: f.createdTime })
    }
    pageToken = res.data.nextPageToken || undefined
  } while (pageToken)
  return out
}

// Descarga el contenido binario de un archivo
export async function descargarArchivo(fileId: string): Promise<Buffer> {
  const drive = getDrive()
  const res: any = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  )
  return Buffer.from(res.data as ArrayBuffer)
}

export function extraerFolderId(url: string): string | null {
  const m = url.match(/folders\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : url.match(/^[a-zA-Z0-9_-]{20,}$/) ? url : null
}
