import { Bell, Moon, Sun, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useClock } from '../../hooks/useClock';
import { StatusDot } from '../ui';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { formattedTime, formattedDate } = useClock();

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
          className="relative p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-overlay border border-transparent hover:border-border-subtle transition-all"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-red ring-2 ring-surface" />
        </button>

        {/* Dispatcher Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-blue/20 to-purple-500/20 border border-border flex items-center justify-center text-xs font-bold text-fg shadow-xs">
          SS
        </div>
      </div>
    </header>
  );
}
