// Esquema estricto y versionado del EditPlan.
// La IA solo produce este JSON; NUNCA comandos de shell.

export const EDIT_PLAN_VERSION = '1.0'

export interface EditPlanOutput {
  aspectRatio: string
  width: number
  height: number
  fps: number
}

export interface EditSegment {
  sourceStart: number
  sourceEnd: number
  outputStart: number
}

export interface EditPlan {
  version: string
  sourceVideoId: string
  output: EditPlanOutput
  segments: EditSegment[]
  crop: unknown[]
  zoom: unknown[]
  captions: unknown[]
  audio: Record<string, unknown>
  effects: Record<string, unknown>
}

export function emptyEditPlan(sourceVideoId: string, output: EditPlanOutput): EditPlan {
  return {
    version: EDIT_PLAN_VERSION,
    sourceVideoId,
    output,
    segments: [],
    crop: [],
    zoom: [],
    captions: [],
    audio: {},
    effects: {},
  }
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

function esNumeroFinito(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

// Validación estricta: se ejecuta SIEMPRE antes de pasar un plan al Video Engine.
export function validateEditPlan(plan: unknown): ValidationResult {
  const errors: string[] = []
  if (typeof plan !== 'object' || plan === null) {
    return { ok: false, errors: ['El EditPlan no es un objeto.'] }
  }
  const p = plan as Record<string, unknown>

  if (p.version !== EDIT_PLAN_VERSION) errors.push(`Versión inválida (se espera ${EDIT_PLAN_VERSION}).`)
  if (typeof p.sourceVideoId !== 'string' || !p.sourceVideoId) errors.push('Falta sourceVideoId.')

  const out = p.output as Record<string, unknown> | undefined
  if (!out) {
    errors.push('Falta output.')
  } else {
    if (typeof out.aspectRatio !== 'string') errors.push('output.aspectRatio inválido.')
    if (!esNumeroFinito(out.width) || out.width <= 0) errors.push('output.width inválido.')
    if (!esNumeroFinito(out.height) || out.height <= 0) errors.push('output.height inválido.')
    if (!esNumeroFinito(out.fps) || out.fps <= 0) errors.push('output.fps inválido.')
  }

  if (!Array.isArray(p.segments)) {
    errors.push('segments debe ser un array.')
  } else {
    p.segments.forEach((s, i) => {
      const seg = s as Record<string, unknown>
      if (!esNumeroFinito(seg.sourceStart) || (seg.sourceStart as number) < 0) errors.push(`segment[${i}].sourceStart inválido.`)
      if (!esNumeroFinito(seg.sourceEnd)) errors.push(`segment[${i}].sourceEnd inválido.`)
      if (esNumeroFinito(seg.sourceStart) && esNumeroFinito(seg.sourceEnd) && (seg.sourceEnd as number) <= (seg.sourceStart as number)) {
        errors.push(`segment[${i}]: sourceEnd debe ser mayor que sourceStart.`)
      }
      if (!esNumeroFinito(seg.outputStart) || (seg.outputStart as number) < 0) errors.push(`segment[${i}].outputStart inválido.`)
    })
  }

  for (const k of ['crop', 'zoom', 'captions'] as const) {
    if (p[k] !== undefined && !Array.isArray(p[k])) errors.push(`${k} debe ser un array.`)
  }

  return { ok: errors.length === 0, errors }
}
