// Tipos compartidos del AI Video Editor (FASE 1)

export type JobStatus =
  | 'UPLOADED' | 'QUEUED' | 'PREPROCESSING' | 'ANALYZING' | 'PLANNING'
  | 'RENDERING' | 'QUALITY_CHECK' | 'REVIEW' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

// Flujo "feliz" de estados (para simular el avance en FASE 1)
export const JOB_STATUS_FLOW: JobStatus[] = [
  'UPLOADED', 'QUEUED', 'PREPROCESSING', 'ANALYZING', 'PLANNING',
  'RENDERING', 'QUALITY_CHECK', 'REVIEW', 'COMPLETED',
]

export const STATUS_LABEL: Record<JobStatus, string> = {
  UPLOADED: 'Subido',
  QUEUED: 'En cola',
  PREPROCESSING: 'Preparando',
  ANALYZING: 'Analizando',
  PLANNING: 'Planificando',
  RENDERING: 'Renderizando',
  QUALITY_CHECK: 'Control de calidad',
  REVIEW: 'Para revisar',
  COMPLETED: 'Completado',
  FAILED: 'Error',
  CANCELLED: 'Cancelado',
}

// Ajustes estructurados de un Editing Profile.
// Campos concretos + firma abierta para no bloquear ajustes futuros.
export interface EditingProfileSettings {
  targetDurationMin?: number
  targetDurationMax?: number
  aspectRatio?: string
  resolution?: string
  fps?: number
  cutSpeed?: 'slow' | 'medium' | 'fast'
  cutsToCombine?: number
  hookStrategy?: string
  removeSilence?: boolean
  removePreparation?: boolean
  removeEnding?: boolean
  removeBadTakes?: boolean
  facePriority?: boolean
  bodyPriority?: boolean
  autoCrop?: boolean
  autoZoom?: boolean
  zoomPerSecond?: boolean
  maximumZoom?: number
  colorStyle?: string
  captionStyle?: string
  transitions?: string
  music?: string
  audioNormalization?: boolean
  [key: string]: unknown
}

export const DEFAULT_PROFILE_SETTINGS: EditingProfileSettings = {
  targetDurationMin: 15,
  targetDurationMax: 30,
  aspectRatio: '9:16',
  resolution: '1080x1920',
  fps: 30,
  cutSpeed: 'medium',
  cutsToCombine: 3,
  removeSilence: true,
  removePreparation: true,
  removeEnding: true,
  facePriority: true,
  bodyPriority: true,
  autoCrop: true,
  autoZoom: true,
  zoomPerSecond: false,
  maximumZoom: 1.2,
  audioNormalization: true,
}
