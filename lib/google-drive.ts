// lib/google-drive.ts — cuenta archivos en carpetas de Drive con la cuenta de servicio
import { google } from 'googleapis'

function getDrive() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON')
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

export function extraerFolderId(url: string): string | null {
  const m = url.match(/folders\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}
