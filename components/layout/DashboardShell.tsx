'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import type { Profile, UserRole } from '@/types'

interface DashboardShellProps {
  profile: Profile
  children: React.ReactNode
}

export default function DashboardShell({ profile, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-full min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Sidebar
        role={profile.role as UserRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          fullName={profile.full_name}
          role={profile.role as UserRole}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
