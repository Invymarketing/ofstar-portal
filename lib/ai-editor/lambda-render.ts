// Puente entre Skeilab y la Lambda de Remotion (motor de render en AWS).
import { renderMediaOnLambda, getRenderProgress, presignUrl } from '@remotion/lambda-client'
import type { EditPlan } from './edit-plan'

type RenderRegion = Parameters<typeof renderMediaOnLambda>[0]['region']

const REGION = (process.env.REMOTION_AWS_REGION || 'eu-north-1') as RenderRegion
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME || ''
const SERVE_URL = process.env.REMOTION_SERVE_URL || ''
const FRAMES_PER_LAMBDA = Number(process.env.REMOTION_FRAMES_PER_LAMBDA || '200')

export function lambdaConfigured(): boolean {
  return Boolean(
    process.env.REMOTION_AWS_ACCESS_KEY_ID &&
    process.env.REMOTION_AWS_SECRET_ACCESS_KEY &&
    FUNCTION_NAME &&
    SERVE_URL,
  )
}

export async function startLambdaRender(src: string, editPlan: EditPlan): Promise<{ renderId: string; bucketName: string }> {
  if (!lambdaConfigured()) throw new Error('Faltan variables REMOTION_* en el servidor.')
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: REGION,
    functionName: FUNCTION_NAME,
    serveUrl: SERVE_URL,
    composition: 'SkeilabEdit',
    inputProps: { src, editPlan },
    codec: 'h264',
    framesPerLambda: FRAMES_PER_LAMBDA,
    privacy: 'private',
    downloadBehavior: { type: 'play-in-browser' },
  })
  return { renderId, bucketName }
}

export interface RenderPoll {
  done: boolean
  progress: number
  outputUrl: string | null
  error: string | null
}

export async function pollLambdaRender(renderId: string, bucketName: string): Promise<RenderPoll> {
  const p = await getRenderProgress({ renderId, bucketName, functionName: FUNCTION_NAME, region: REGION })
  if (p.fatalErrorEncountered) {
    const msg = p.errors && p.errors.length > 0 ? p.errors[0].message : 'Error de render en Lambda'
    return { done: false, progress: p.overallProgress ?? 0, outputUrl: null, error: msg }
  }
  if (p.done) {
    const objectKey = p.outKey ?? `renders/${renderId}/out.mp4`
    const bkt = p.outBucket ?? bucketName
    const outputUrl = await presignUrl({
      region: REGION,
      bucketName: bkt,
      objectKey,
      expiresInSeconds: 3600,
      checkIfObjectExists: false,
    })
    return { done: true, progress: 1, outputUrl, error: null }
  }
  return { done: false, progress: p.overallProgress ?? 0, outputUrl: null, error: null }
}

// URL firmada del vídeo editado (para descargarlo desde el servidor).
export async function presignOutput(renderId: string, bucketName: string): Promise<string> {
  const objectKey = `renders/${renderId}/out.mp4`
  return await presignUrl({
    region: REGION,
    bucketName,
    objectKey,
    expiresInSeconds: 600,
    checkIfObjectExists: false,
  })
}
