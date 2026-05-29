import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  sub?: string
}

export function StatCard({ label, value, change, changeType = 'neutral', sub }: StatCardProps) {
  return (
    <div className="bg-[#111111] border border-white/[0.07] rounded-lg p-4">
      <p className="text-white/40 text-xs font-medium tracking-wide uppercase mb-3">{label}</p>
      <p className="text-white text-2xl font-semibold tabular-nums">{value}</p>
      {(change || sub) && (
        <p className={cn(
          'text-xs mt-1.5',
          changeType === 'up'      && 'text-emerald-400',
          changeType === 'down'    && 'text-red-400',
          changeType === 'neutral' && 'text-white/35',
        )}>
          {change ?? sub}
        </p>
      )}
    </div>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-white text-lg font-semibold">{title}</h1>
        {subtitle && <p className="text-white/40 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

interface SectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function Section({ title, children, className }: SectionProps) {
  return (
    <div className={cn('bg-[#111111] border border-white/[0.07] rounded-lg', className)}>
      {title && (
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <p className="text-white/60 text-xs font-medium tracking-wide uppercase">{title}</p>
        </div>
      )}
      {children}
    </div>
  )
}

interface BadgeProps {
  label: string
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray'
}

export function StatusBadge({ label, variant = 'gray' }: BadgeProps) {
  const styles = {
    green:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    red:    'bg-red-500/10 text-red-400 border border-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    blue:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    gray:   'bg-white/5 text-white/40 border border-white/10',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium', styles[variant])}>
      {label}
    </span>
  )
}
