// AIProvider: capa de abstracción de IA.
// FASE 1: solo un stub que NO llama a ninguna API.
// FASE 2: implementaciones OpenAIProvider / AnthropicProvider / GoogleProvider.
// Se elige con la variable de entorno AI_PROVIDER (por defecto 'stub').

import type { EditPlan, EditPlanOutput } from './edit-plan'
import { emptyEditPlan } from './edit-plan'
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
  analysis?: unknown
}

export interface AIProvider {
  name: string
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

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? 'stub'
  switch (provider) {
    // case 'openai': return new OpenAIProvider()      // FASE 2
    // case 'anthropic': return new AnthropicProvider() // FASE 2
    default:
      return new StubProvider()
  }
}
