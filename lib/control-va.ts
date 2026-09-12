export type TareaKey = 'actividad' | 'historia' | 'reel' | 'trial' | 'facebook' | 'tiktok'

export const TAREAS: { key: TareaKey; label: string; col: string; ts: string; min: string; defMin: number }[] = [
  { key: 'actividad', label: 'Actividad', col: 'check_actividad', ts: 'ts_actividad', min: 'min_actividad', defMin: 8 },
  { key: 'historia', label: 'Historia', col: 'check_historia', ts: 'ts_historia', min: 'min_historia', defMin: 3 },
  { key: 'reel', label: 'Reel', col: 'check_reel', ts: 'ts_reel', min: 'min_reel', defMin: 4 },
  { key: 'trial', label: 'Trial Reel', col: 'check_trial', ts: 'ts_trial', min: 'min_trial', defMin: 4 },
  { key: 'facebook', label: 'Facebook', col: 'check_facebook', ts: 'ts_facebook', min: 'min_facebook', defMin: 5 },
  { key: 'tiktok', label: 'TikTok', col: 'check_tiktok', ts: 'ts_tiktok', min: 'min_tiktok', defMin: 5 },
]

export const TAREA_KEYS: string[] = TAREAS.map((t) => t.key)
