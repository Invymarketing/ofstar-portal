'use client'

import { useState } from 'react'
import ListaJobs from './ListaJobs'
import PerfilesEdicion from './PerfilesEdicion'

export default function AiEditor() {
  const [tab, setTab] = useState<'videos' | 'perfiles'>('videos')
  const label: Record<string, string> = { videos: 'Vídeos', perfiles: 'Editing Profiles' }
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(['videos', 'perfiles'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: tab === t ? 'var(--gold-15)' : 'transparent', color: tab === t ? 'var(--gold)' : 'var(--muted)', border: `1px solid ${tab === t ? 'var(--gold-25)' : 'var(--border)'}` }}>
            {label[t]}
          </button>
        ))}
      </div>
      {tab === 'videos' ? <ListaJobs /> : <PerfilesEdicion />}
    </div>
  )
}
