import { useState } from 'react';
import { Bell, Moon, Sun, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useClock } from '../../hooks/useClock';
import { useDispatchContext } from '../../context/DispatchContext';
import { StatusDot } from '../ui';
import { NotificationDrawer } from '../notifications/NotificationDrawer';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { formattedTime, formattedDate } = useClock();
  const { realtimeStatus, unreadNotificationCount } = useDispatchContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 sm:px-8 border-b border-border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-20 transition-colors">
      {/* Left — Breadcrumb & Page title */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-faint hidden sm:inline">
          EOC Console
        </span>
        <span className="text-fg-faint hidden sm:inline">/</span>
        <h1 className="text-lg font-bold tracking-tight text-fg font-sans">{title}</h1>
      </div>

      {/* Right — Live Status & Controls */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Real-time Connection Status indicator pill */}
        {realtimeStatus === 'LIVE' && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono font-medium text-emerald-500 shadow-xs"
            title="Connected to Supabase Realtime channel"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE</span>
          </div>
        )}

        {realtimeStatus === 'DEMO_LIVE' && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] font-mono font-medium text-amber-500 shadow-xs"
            title="Operating in simulated Demo Live Event Bus mode"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>DEMO LIVE MODE</span>
          </div>
        )}

        {(realtimeStatus === 'CONNECTING' || realtimeStatus === 'RECONNECTING') && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-[11px] font-mono font-medium text-accent-blue shadow-xs"
            title="Establishing realtime subscription"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
            <span>{realtimeStatus === 'RECONNECTING' ? 'RECONNECTING...' : 'CONNECTING...'}</span>
          </div>
        )}

        {realtimeStatus === 'OFFLINE' && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-[11px] font-mono font-medium text-rose-500 shadow-xs"
            title="Connection offline"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>OFFLINE</span>
          </div>
        )}

        {/* System status pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-overlay border border-border-subtle text-xs text-fg-muted shadow-xs">
          <StatusDot color="green" pulse size="xs" />
          <ShieldCheck className="w-3.5 h-3.5 text-status-available" />
          <span className="font-medium text-fg">Systems Operational</span>
        </div>

        {/* Live Date / Time */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-fg-muted font-mono">
          <span>{formattedDate}</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg font-semibold">{formattedTime}</span>
          <span className="text-[10px] text-fg-faint">IST</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border-subtle hidden md:block" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-overlay border border-transparent hover:border-border-subtle transition-all"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-[18px] h-[18px] text-amber-400 transition-transform duration-200 hover:rotate-45" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-slate-700 transition-transform duration-200 hover:-rotate-12" />
          )}
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="relative p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-overlay border border-transparent hover:border-border-subtle transition-all"
          aria-label={`Notifications (${unreadNotificationCount} unread)`}
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-red text-white text-[10px] font-mono font-bold flex items-center justify-center ring-2 ring-surface shadow-xs animate-in zoom-in-50 duration-200">
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </span>
          )}
        </button>

        {/* Dispatcher Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-blue/20 to-purple-500/20 border border-border flex items-center justify-center text-xs font-bold text-fg shadow-xs">
          SS
        </div>
      </div>

      {/* Notification Drawer */}
      <NotificationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </header>
  );
}
