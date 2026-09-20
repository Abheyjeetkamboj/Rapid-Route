import type { ReactNode } from 'react';

/* =========================================================
   1. STATUS DOT
   ========================================================= */
export interface StatusDotProps {
  color: 'green' | 'amber' | 'red' | 'gray' | 'blue';
  pulse?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

const dotColors = {
  green: 'bg-status-available',
  amber: 'bg-status-enroute',
  red: 'bg-status-busy',
  gray: 'bg-status-offline',
  blue: 'bg-accent-blue',
};

const pingColors = {
  green: 'bg-status-available',
  amber: 'bg-status-enroute',
  red: 'bg-status-busy',
  gray: 'bg-status-offline',
  blue: 'bg-accent-blue',
};

export function StatusDot({ color, pulse, size = 'sm' }: StatusDotProps) {
  const sizeClass = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
  }[size];

  return (
    <span className="relative inline-flex items-center justify-center flex-shrink-0">
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${pingColors[color]} opacity-60 animate-ping-subtle`}
        />
      )}
      <span className={`relative inline-flex rounded-full ${sizeClass} ${dotColors[color]}`} />
    </span>
  );
}

/* =========================================================
   2. REFINED STATUS PILL
   ========================================================= */
export interface StatusPillProps {
  status: 'READY' | 'LIMITED' | 'DIVERTING' | 'FULL' | 'AVAILABLE' | 'EN_ROUTE' | 'BUSY' | 'OFFLINE' | 'AWAITING' | 'DISPATCHED';
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, label, size = 'sm' }: StatusPillProps) {
  const config: Record<
    StatusPillProps['status'],
    { dot: 'green' | 'amber' | 'red' | 'gray' | 'blue'; text: string; bg: string; border: string; defaultLabel: string; pulse?: boolean }
  > = {
    READY: { dot: 'green', text: 'text-status-available', bg: 'bg-accent-greenSubtle', border: 'border-status-available/20', defaultLabel: 'READY', pulse: true },
    AVAILABLE: { dot: 'green', text: 'text-status-available', bg: 'bg-accent-greenSubtle', border: 'border-status-available/20', defaultLabel: 'AVAILABLE', pulse: true },
    LIMITED: { dot: 'amber', text: 'text-status-enroute', bg: 'bg-accent-amberSubtle', border: 'border-status-enroute/20', defaultLabel: 'LIMITED' },
    EN_ROUTE: { dot: 'amber', text: 'text-status-enroute', bg: 'bg-accent-amberSubtle', border: 'border-status-enroute/20', defaultLabel: 'EN ROUTE', pulse: true },
    DIVERTING: { dot: 'red', text: 'text-status-busy', bg: 'bg-accent-redSubtle', border: 'border-status-busy/20', defaultLabel: 'DIVERTING' },
    FULL: { dot: 'red', text: 'text-status-busy', bg: 'bg-accent-redSubtle', border: 'border-status-busy/20', defaultLabel: 'FULL' },
    BUSY: { dot: 'red', text: 'text-status-busy', bg: 'bg-accent-redSubtle', border: 'border-status-busy/20', defaultLabel: 'BUSY' },
    AWAITING: { dot: 'red', text: 'text-status-busy', bg: 'bg-accent-redSubtle', border: 'border-status-busy/20', defaultLabel: 'AWAITING DISPATCH', pulse: true },
    DISPATCHED: { dot: 'blue', text: 'text-accent-blue', bg: 'bg-accent-blueSubtle', border: 'border-accent-blue/20', defaultLabel: 'DISPATCHED' },
    OFFLINE: { dot: 'gray', text: 'text-status-offline', bg: 'bg-surface-overlay', border: 'border-border-subtle', defaultLabel: 'OFFLINE' },
  };

  const current = config[status] || config.OFFLINE;
  const padding = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium tracking-wide rounded-full border ${current.bg} ${current.text} ${current.border} ${padding}`}
    >
      <StatusDot color={current.dot} pulse={current.pulse} size="xs" />
      <span>{label || current.defaultLabel}</span>
    </span>
  );
}

/* =========================================================
   3. BADGE
   ========================================================= */
export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'red' | 'green' | 'amber' | 'blue' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

const badgeVariants = {
  default: 'bg-surface-overlay text-fg-muted border-border-subtle',
  red: 'bg-accent-redSubtle text-accent-red border-accent-red/20',
  green: 'bg-accent-greenSubtle text-accent-green border-status-available/20',
  amber: 'bg-accent-amberSubtle text-accent-amber border-status-enroute/20',
  blue: 'bg-accent-blueSubtle text-accent-blue border-accent-blue/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const sizeStyle = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${badgeVariants[variant]} ${sizeStyle} ${className}`}
    >
      {children}
    </span>
  );
}

/* =========================================================
   4. PAGE HERO HEADER
   ========================================================= */
export interface PageHeroProps {
  category?: string;
  title: string;
  description: string;
  telemetryStatus?: string;
  telemetryDot?: 'green' | 'amber' | 'blue';
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHero({
  category,
  title,
  description,
  telemetryStatus = 'LIVE TELEMETRY',
  telemetryDot = 'green',
  action,
  children,
  className = '',
}: PageHeroProps) {
  return (
    <div className={`relative overflow-hidden pb-2 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          {category && (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-accent-blue">
              {category}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg font-sans">
            {title}
          </h1>
          <p className="text-sm text-fg-muted leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {action}
          {telemetryStatus && (
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface border border-border text-xs font-medium text-fg shadow-card">
              <StatusDot color={telemetryDot} pulse />
              <span className="text-fg-muted uppercase tracking-wider text-[11px]">
                {telemetryStatus}
              </span>
              <span className="font-mono text-[10px] text-fg-faint">● ONLINE</span>
            </div>
          )}
        </div>
      </div>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

/* =========================================================
   5. ELEVATED METRIC CARD (Hierarchy & Polish)
   ========================================================= */
export interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  accentColor?: 'red' | 'green' | 'amber' | 'blue';
  variant?: 'primary' | 'secondary';
  className?: string;
}

const accentTop = {
  red: 'after:bg-accent-red',
  green: 'after:bg-status-available',
  amber: 'after:bg-status-enroute',
  blue: 'after:bg-accent-blue',
};

export function MetricCard({
  label,
  value,
  icon,
  subtitle,
  trend,
  trendUp,
  accentColor,
  variant = 'secondary',
  className = '',
}: MetricCardProps) {
  const isPrimary = variant === 'primary';

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
        isPrimary
          ? 'bg-surface shadow-card hover:shadow-card-hover border-border'
          : 'bg-surface/80 hover:bg-surface shadow-card hover:shadow-card-hover border-border-subtle hover:border-border'
      } ${
        accentColor ? `after:absolute after:top-0 after:left-0 after:right-0 after:h-[2px] ${accentTop[accentColor]}` : ''
      } p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-muted">
            {label}
          </p>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-semibold tracking-tight text-fg font-sans">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-medium inline-flex items-center gap-0.5 ${
                  trendUp ? 'text-status-available' : 'text-accent-red'
                }`}
              >
                {trendUp ? '↑' : '↓'} {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-fg-faint pt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>

        {icon && (
          <div className="p-2.5 rounded-lg bg-surface-overlay text-fg-muted group-hover:text-fg transition-colors flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   6. PROGRESS BAR / CAPACITY METER
   ========================================================= */
export interface CapacityMeterProps {
  value: number;
  max: number;
  label?: string;
  sublabel?: string;
  color?: 'blue' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md';
}

export function CapacityMeter({
  value,
  max,
  label,
  sublabel,
  color = 'blue',
  size = 'md',
}: CapacityMeterProps) {
  const percentage = Math.min(Math.round((value / Math.max(max, 1)) * 100), 100);

  const barColors = {
    blue: 'bg-accent-blue',
    green: 'bg-status-available',
    amber: 'bg-status-enroute',
    red: 'bg-accent-red',
  };

  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="space-y-1.5 w-full">
      {(label || sublabel) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-fg">{label}</span>}
          {sublabel && <span className="font-mono text-fg-muted">{sublabel}</span>}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-surface-inset border border-border-subtle ${heightClass}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   7. CARD (Refined Visual Hierarchy)
   ========================================================= */
export interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  noPadding?: boolean;
  variant?: 'primary' | 'subtle' | 'elevated' | 'ghost';
  interactive?: boolean;
}

export function Card({
  children,
  title,
  subtitle,
  icon,
  action,
  className = '',
  noPadding,
  variant = 'primary',
  interactive = false,
}: CardProps) {
  const variantStyles = {
    primary: 'bg-surface border-border-subtle shadow-card',
    subtle: 'bg-surface/60 border-border-subtle shadow-xs',
    elevated: 'bg-surface-raised border-border shadow-elevated',
    ghost: 'bg-transparent border-transparent',
  }[variant];

  const hoverStyle = interactive
    ? 'hover:border-border hover:shadow-card-hover cursor-pointer transition-all duration-200'
    : '';

  return (
    <div className={`rounded-xl border ${variantStyles} ${hoverStyle} ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border-subtle">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <span className="text-fg-muted flex-shrink-0">{icon}</span>}
            <div className="min-w-0">
              {title && (
                <h3 className="text-base font-semibold text-fg tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-fg-muted mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
}

/* =========================================================
   8. BUTTON (Polished States)
   ========================================================= */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm font-semibold',
  };

  const variants = {
    primary:
      'bg-red-600 bg-accent-red text-white hover:bg-red-700 active:bg-red-800 shadow-sm hover:shadow',
    secondary:
      'bg-surface-overlay text-fg border border-border hover:bg-surface-raised hover:border-border-strong active:bg-surface-inset',
    outline:
      'bg-transparent text-fg border border-border hover:bg-surface-overlay active:bg-surface-inset',
    ghost:
      'text-fg-muted hover:text-fg hover:bg-surface-overlay active:bg-surface-inset',
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

/* =========================================================
   9. DRAWER
   ========================================================= */
export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, subtitle, badge, children }: DrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-surface border-l border-border shadow-elevated flex flex-col z-10 animate-[slideIn_0.2s_ease]">
        <div className="flex items-center justify-between p-6 border-b border-border-subtle bg-surface-raised/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-fg tracking-tight">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="text-xs text-fg-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-overlay text-fg-muted hover:text-fg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>
      </div>
    </div>
  );
}
