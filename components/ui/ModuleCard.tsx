import Link from 'next/link'
import {
  Bot,
  Sparkles,
  DollarSign,
  MessageSquare,
  BarChart3,
  Users,
  Calendar,
  Bell,
  FolderOpen,
  UserPlus,
  Megaphone,
  ArrowRight,
  Clock,
} from 'lucide-react'
import type { ModuleDefinition } from '@/types'

const ICON_MAP: Record<string, React.ElementType> = {
  Bot,
  Sparkles,
  DollarSign,
  MessageSquare,
  BarChart3,
  Users,
  Calendar,
  Bell,
  FolderOpen,
  UserPlus,
  Megaphone,
}

interface ModuleCardProps {
  module: ModuleDefinition
}

export default function ModuleCard({ module }: ModuleCardProps) {
  const Icon = ICON_MAP[module.icon]

  if (!module.isBuilt) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 opacity-60 cursor-default">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center flex-shrink-0">
            {Icon && <Icon size={18} className="text-muted" />}
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted bg-border px-2 py-1 rounded-full uppercase tracking-wider">
            <Clock size={10} />
            Próximamente
          </span>
        </div>
        <h3 className="text-sm font-semibold text-muted mb-1">{module.name}</h3>
        <p className="text-xs text-muted/60 leading-relaxed line-clamp-2">
          {module.description}
        </p>
      </div>
    )
  }

  return (
    <Link
      href={`/${module.slug}`}
      className="
        group bg-surface border border-border rounded-2xl p-5
        hover:border-gold/30 hover:bg-gold/5 transition-all duration-200
        cursor-pointer
      "
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0 group-hover:bg-gold/20 transition-colors">
          {Icon && <Icon size={18} className="text-gold" />}
        </div>
        <ArrowRight
          size={14}
          className="text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all"
        />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-gold transition-colors">
        {module.name}
      </h3>
      <p className="text-xs text-muted leading-relaxed line-clamp-2">
        {module.description}
      </p>
    </Link>
  )
}
