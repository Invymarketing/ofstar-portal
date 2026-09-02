export type UserRole = 'admin' | 'manager' | 'team_leader' | 'chatter' | 'va' | 'modelo' | 'creativo'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  model_name?: string | null
  avatar_url?: string | null
  content_snare_url?: string | null
  notion_url?: string | null
  created_at: string
  updated_at: string
}

export interface ModuleDefinition {
  id: number
  slug: string
  name: string
  description: string
  icon: string
  phase: number
  allowedRoles: UserRole[]
  isBuilt: boolean
  area?: string
}
