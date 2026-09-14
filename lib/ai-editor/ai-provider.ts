// AIProvider: capa de abstracción de IA.
// - 'stub' (por defecto): no llama a ninguna API.
// - 'openai': genera el EditPlan de verdad con OpenAI (modelo configurable).
// Se elige con AI_PROVIDER; el modelo con OPENAI_PLANNING_MODEL.
// La API key vive SOLO en el servidor (OPENAI_API_KEY), nunca llega al cliente.

import type { EditPlan, EditPlanOutput } from './edit-plan'
import { emptyEditPlan, validateEditPlan, EDIT_PLAN_VERSION } from './edit-plan'
import type { EditingProfileSettings } from './types'

export interface AnalyzeInput {
  frames?: string[]
  transcript?: unknown
  metadata?: Record<string, unknown>
}

export interface GeneratePlanInput {
  sourceVideoId: string
  output: EditPlanOutput
  settings: EditingProfileSettings
  customInstructions?: string
  videoInfo?: { duration?: number; width?: number; height?: number }
  analysis?: unknown
}

export interface AIProvider {
  name: string
  lastUsage?: { inputTokens: number; outputTokens: number }
  analyzeVideo(input: AnalyzeInput): Promise<unknown>
  analyzeFrames(frames: string[]): Promise<unknown>
  generateEditPlan(input: GeneratePlanInput): Promise<EditPlan>
  evaluateOutput(plan: EditPlan): Promise<{ score: number; issues: string[] }>
}

class StubProvider implements AIProvider {
  name = 'stub'
  async analyzeVideo(): Promise<unknown> { return {} }
  async analyzeFrames(): Promise<unknown> { return {} }
  async generateEditPlan(input: GeneratePlanInput): Promise<EditPlan> {
    return emptyEditPlan(input.sourceVideoId, input.output)
  }
  async evaluateOutput(): Promise<{ score: number; issues: string[] }> {
    return { score: 0, issues: [] }
  }
}

class OpenAIProvider implements AIProvider {
  name = 'openai'
  lastUsage?: { inputTokens: number; outputTokens: number }
  async analyzeVideo(): Promise<unknown> { return {} }
  async analyzeFrames(): Promise<unknown> { return {} }
  async evaluateOutput(): Promise<{ score: number; issues: string[] }> { return { score: 0, issues: [] } }

  async generateEditPlan(input: GeneratePlanInput): Promise<EditPlan> {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error('Falta la variable OPENAI_API_KEY en el servidor.')
    const model = process.env.OPENAI_PLANNING_MODEL ?? 'gpt-5.6-luna'

    const sistema = [
      'Eres un montador profesional de vídeos verticales para redes (Reels/TikTok). Tu trabajo es hacer un montaje DINÁMICO, con RITMO y con CORTES que se noten.',
      'Devuelve SOLO un JSON válido (EditPlan), sin ningún texto adicional, con esta forma:',
      '{"version":"1.0","sourceVideoId":"...","output":{"aspectRatio":"9:16","width":1080,"height":1920,"fps":30},"segments":[{"sourceStart":0.5,"sourceEnd":2.2,"outputStart":0}],"zoom":[{"scale":1.25,"centerX":0.5,"centerY":0.4,"sourceStart":0.5,"sourceEnd":2.2}],"crop":[],"captions":[],"audio":{"normalize":true},"effects":{"cutStyle":"hard"}}',
      'REGLA MÁS IMPORTANTE (cortes reales): cada segmento debe venir de una parte DISTINTA y NO consecutiva del vídeo. Está PROHIBIDO trocear el vídeo en pedazos seguidos (ej. 0-1.5, 1.5-3, 3-4.5, ...): eso NO es un corte, es el vídeo entero de corrido.',
      'Entre el final de un trozo (sourceEnd) y el inicio del siguiente (sourceStart) debe haber un SALTO de al menos 1 segundo en el vídeo original. Salta por todo el metraje y deja huecos entre los trozos que eliges, para que cada corte se vea de verdad.',
      'Número de cortes: entre 3 y 6 para vídeos de menos de 20s (más para vídeos largos). Cada corte de 1 a 2.5 segundos. Elige los mejores momentos (cara visible, buen encuadre, movimiento o gesto).',
      'Zoom: añade un zoom a CADA corte para dar dinamismo. Formato {"scale": entre 1.15 y 1.35, "centerX":0.5, "centerY": entre 0.35 y 0.5, "sourceStart":..., "sourceEnd":...} centrado en la cara/torso. Varía un poco la escala entre cortes.',
      'Tiempos: en segundos, siempre dentro de duracionVideoSegundos cuando se indique. sourceEnd > sourceStart. El outputStart de cada segmento = suma de las duraciones de los segmentos anteriores, empezando en 0.',
      'Respeta SIEMPRE las instrucciones de la modelo (campos ajustes e instrucciones): si piden más/menos zoom, más/menos cortes, un estilo concreto, hazlo. Deja captions vacío por ahora. Devuelve SOLO el JSON.',
    ].join('\n')

    const usuario = JSON.stringify({
      sourceVideoId: input.sourceVideoId,
      output: input.output,
      ajustes: input.settings,
      instrucciones: input.customInstructions ?? '',
      duracionVideoSegundos: input.videoInfo?.duration ?? null,
      dimensionesOriginal: input.videoInfo ? { width: input.videoInfo.width ?? null, height: input.videoInfo.height ?? null } : null,
    })

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }],
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`OpenAI ${res.status}: ${t.slice(0, 300)}`)
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content ?? '{}'
    let parsed: unknown
    try { parsed = JSON.parse(content) } catch { throw new Error('La IA no devolvió un JSON válido.') }

    const plan = { ...emptyEditPlan(input.sourceVideoId, input.output), ...(parsed as Record<string, unknown>) } as EditPlan
    plan.version = EDIT_PLAN_VERSION
    plan.sourceVideoId = input.sourceVideoId
    plan.output = input.output
    if (!Array.isArray(plan.segments)) plan.segments = []
    const asRec = plan as unknown as Record<string, unknown>
    for (const k of ['crop', 'zoom', 'captions'] as const) { if (!Array.isArray(asRec[k])) asRec[k] = [] }
    if (typeof asRec.audio !== 'object' || asRec.audio === null) asRec.audio = {}
    if (typeof asRec.effects !== 'object' || asRec.effects === null) asRec.effects = {}

    this.lastUsage = { inputTokens: data?.usage?.prompt_tokens ?? 0, outputTokens: data?.usage?.completion_tokens ?? 0 }

    const v = validateEditPlan(plan)
    if (!v.ok) throw new Error('El plan de la IA no pasó la validación: ' + v.errors.slice(0, 3).join('; '))
    return plan
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? 'stub'
  switch (provider) {
    case 'openai': return new OpenAIProvider()
    // case 'anthropic': return new AnthropicProvider() // futuro
    default: return new StubProvider()
  }
}
