// VideoEngine: operaciones deterministas de vídeo.
// FASE 1: stub que lanza error (no hay render todavía).
// FASE 2: implementación real con FFmpeg / Remotion en un worker aparte.
// La IA elige operaciones y parámetros; NUNCA genera comandos de shell.

import type { EditPlan } from './edit-plan'

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  fps: number
  codec: string
  hasAudio: boolean
  orientation: 'portrait' | 'landscape' | 'square'
  sizeBytes: number
}

export interface VideoEngine {
  getVideoMetadata(path: string): Promise<VideoMetadata>
  extractFrames(path: string, fps: number): Promise<string[]>
  extractAudio(path: string): Promise<string>
  generateThumbnail(path: string): Promise<string>
  render(plan: EditPlan, sourcePath: string): Promise<string>
}

const NOT_IMPL = 'Video Engine no implementado todavía (llega en FASE 2: FFmpeg/Remotion).'

class StubEngine implements VideoEngine {
  async getVideoMetadata(): Promise<VideoMetadata> { throw new Error(NOT_IMPL) }
  async extractFrames(): Promise<string[]> { throw new Error(NOT_IMPL) }
  async extractAudio(): Promise<string> { throw new Error(NOT_IMPL) }
  async generateThumbnail(): Promise<string> { throw new Error(NOT_IMPL) }
  async render(): Promise<string> { throw new Error(NOT_IMPL) }
}

export function getVideoEngine(): VideoEngine {
  return new StubEngine()
}
