// StorageProvider: abstracción de almacenamiento.
// FASE 1: implementación sobre Supabase Storage (bucket privado).
// Diseñado para poder migrar a S3 / Cloudflare R2 sin tocar el editor.

import { createAdminClient } from '@/lib/supabase/admin'

export const STORAGE_BUCKET = 'ai-editor'

export interface StorageProvider {
  upload(path: string, file: ArrayBuffer | Uint8Array, contentType: string): Promise<{ path: string }>
  getSignedUrl(path: string, expiresIn?: number): Promise<string | null>
  remove(path: string): Promise<void>
}

export function getStorage(): StorageProvider {
  const admin = createAdminClient()
  return {
    async upload(path, file, contentType) {
      const body = file instanceof Uint8Array ? file : new Uint8Array(file)
      const { error } = await admin.storage.from(STORAGE_BUCKET).upload(path, body, { contentType, upsert: true })
      if (error) throw new Error(error.message)
      return { path }
    },
    async getSignedUrl(path, expiresIn = 3600) {
      const { data } = await admin.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn)
      return data?.signedUrl ?? null
    },
    async remove(path) {
      await admin.storage.from(STORAGE_BUCKET).remove([path])
    },
  }
}
