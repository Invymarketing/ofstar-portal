'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return user
}

export async function addBotModel(data: {
  model_name: string
  instagram_handle: string
  notion_page_url: string
}) {
  const user = await getAuthenticatedUser()
  const admin = createAdminClient()

  const handle = data.instagram_handle.trim().replace(/^@/, '')
  if (!data.model_name.trim()) throw new Error('El nombre es obligatorio')
  if (!handle) throw new Error('El handle de Instagram es obligatorio')

  const { error } = await admin.from('bot_models').insert({
    model_name: data.model_name.trim(),
    instagram_handle: handle,
    notion_page_url: data.notion_page_url.trim() || null,
    created_by: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/modulo-1')
}

export async function toggleBotModel(id: string, isActive: boolean) {
  await getAuthenticatedUser()
  const admin = createAdminClient()
  const { error } = await admin
    .from('bot_models')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-1')
}

export async function deleteBotModel(id: string) {
  await getAuthenticatedUser()
  const admin = createAdminClient()
  const { error } = await admin.from('bot_models').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-1')
}

export async function executeBotModels(modelId: string | null) {
  const user = await getAuthenticatedUser()
  const admin = createAdminClient()

  let models: { id: string; model_name: string; instagram_handle: string }[] = []

  if (modelId) {
    const { data } = await admin
      .from('bot_models')
      .select('id, model_name, instagram_handle')
      .eq('id', modelId)
      .single()
    if (data) models = [data]
  } else {
    const { data } = await admin
      .from('bot_models')
      .select('id, model_name, instagram_handle')
      .eq('is_active', true)
    models = data ?? []
  }

  if (models.length === 0) throw new Error('No hay modelos activas para ejecutar')

  const executions = models.map((m) => ({
    bot_model_id: m.id,
    model_name: m.model_name,
    instagram_handle: m.instagram_handle,
    status: 'pending' as const,
    triggered_by: user.id,
  }))

  const { error } = await admin.from('bot_executions').insert(executions)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-1')
}

export async function completeExecution(
  id: string,
  data: { status: 'success' | 'error'; reels_found?: number; notes?: string }
) {
  await getAuthenticatedUser()
  const admin = createAdminClient()
  const { error } = await admin
    .from('bot_executions')
    .update({
      status: data.status,
      reels_found: data.reels_found ?? null,
      notes: data.notes?.trim() || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-1')
}

export async function deleteExecution(id: string) {
  await getAuthenticatedUser()
  const admin = createAdminClient()
  const { error } = await admin.from('bot_executions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulo-1')
}
