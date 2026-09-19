import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, ChevronDown, UserCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useClock } from '../../hooks/useClock';
import { useDispatchContext } from '../../context/DispatchContext';
import { useRole } from '../../context/RoleContext';
import { type AppRole, ROLE_CONFIGS } from '../../types/roles';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { GlobalSystemStatus } from '../common/GlobalSystemStatus';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { formattedTime, formattedDate } = useClock();
  const { unreadNotificationCount } = useDispatchContext();
  const { currentRole, currentConfig, setDemoRole, availableRoles } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleSelect = (roleId: AppRole) => {
    setDemoRole(roleId);
    setIsRoleDropdownOpen(false);
    const targetConfig = ROLE_CONFIGS[roleId];
    // If the new role cannot access current path, immediately navigate to their default workspace
    if (!targetConfig.allowedPaths.includes(location.pathname) && location.pathname !== '/') {
      navigate(targetConfig.defaultPath);
    } else if (location.pathname === '/' && targetConfig.defaultPath !== '/') {
      navigate(targetConfig.defaultPath);
    }
  };

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 border-b border-border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-20 transition-colors">
      {/* Left — Breadcrumb & Page title */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-faint hidden sm:inline">
          EOC Console
        </span>
        <span className="text-fg-faint hidden sm:inline">/</span>
        <h1 className="text-lg font-bold tracking-tight text-fg font-sans">{title}</h1>
      </div>

      {/* Right — Live Status, Role Switcher & Controls */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Global Subsystem Health Diagnostics */}
        <GlobalSystemStatus />

        {/* Demo Role Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised hover:bg-surface border border-border-subtle shadow-xs text-xs transition-all hover:border-border"
            title="Switch Demo Role for testing different user workflows"
          >
            <UserCheck className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-[10px] font-mono text-fg-faint hidden md:inline">DEMO ROLE:</span>
            <span className="font-bold text-fg">{currentConfig.label}</span>
            <ChevronDown className="w-3 h-3 text-fg-muted" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-border shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-border-subtle">
                <span className="text-[10px] font-mono font-bold uppercase text-fg-faint">
                  Select Demo Persona
                </span>
              </div>
              {availableRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    currentRole === role.id
                      ? 'bg-accent-blueSubtle text-accent-blue font-bold'
                      : 'hover:bg-surface-raised text-fg-muted hover:text-fg'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-surface border border-border-subtle flex items-center justify-center font-mono text-[10px] font-bold mt-0.5 flex-shrink-0">
                    {role.userBadge}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold flex items-center justify-between">
                      <span>{role.label}</span>
                      {currentRole === role.id && <span className="text-[10px]">●</span>}
                    </div>
                    <p className="text-[10px] text-fg-faint leading-tight line-clamp-1">
                      {role.userRoleTag}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Date / Time */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-fg-muted font-mono">
          <span>{formattedDate}</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg font-semibold">{formattedTime}</span>
          <span className="text-[10px] text-fg-faint">IST</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border-subtle hidden sm:block" />

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

        {/* Notification Bell & Dropdown Panel */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            className={`relative p-2 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
              isNotificationOpen
                ? 'bg-surface-overlay text-fg border border-border shadow-xs'
                : 'text-fg-muted hover:text-fg hover:bg-surface-overlay border border-transparent hover:border-border-subtle'
            }`}
            aria-label={`Notifications (${unreadNotificationCount} unread)`}
            aria-expanded={isNotificationOpen}
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-red text-white text-[10px] font-mono font-bold flex items-center justify-center ring-2 ring-surface shadow-xs animate-in zoom-in-50 duration-200">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            )}
          </button>

          <NotificationPanel
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            anchorRef={notificationRef}
          />
        </div>

        {/* Dynamic Role User Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-blue/20 to-purple-500/20 border border-border flex items-center justify-center text-xs font-bold text-fg shadow-xs cursor-default"
          title={`${currentConfig.userName} (${currentConfig.userRoleTag})`}
        >
          {currentConfig.userBadge}
        </div>
      </div>
    </header>
  );
}
