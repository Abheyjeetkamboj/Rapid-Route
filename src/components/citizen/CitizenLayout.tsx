import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import {
  Home,
  AlertCircle,
  Clock,
  Bell,
  User,
  Sun,
  Moon,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useRole } from '../../context/RoleContext';
import { useCitizen } from '../../context/CitizenContext';
import { type AppRole, ROLE_CONFIGS } from '../../types/roles';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ToastContainer } from '../notifications/ToastContainer';
import { DemoLiveController } from '../notifications/DemoLiveController';

export const CitizenLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentRole, setDemoRole, availableRoles } = useRole();
  const { activeEmergency, citizenNotifications } = useCitizen();
  const location = useLocation();
  const navigate = useNavigate();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
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
    navigate(targetConfig.defaultPath);
  };

  const unreadAlerts = citizenNotifications.filter((n) => !n.read).length;

  return (
    <div className="h-screen h-[100dvh] w-full bg-app-bg flex flex-col text-fg font-sans antialiased transition-colors overflow-hidden">
      <div className="w-full h-full flex flex-col relative overflow-hidden">
        {/* =========================================================================
            1. CITIZEN HEADER (Responsive Desktop & Mobile)
            ========================================================================= */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-border-subtle bg-surface/95 backdrop-blur-md sticky top-0 z-30 w-full">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-red to-orange-500 flex items-center justify-center shadow-md shadow-accent-red/20 text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-tight text-base text-fg">RapidRoute</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Citizen
                </span>
              </div>
              <p className="text-[11px] text-fg-muted leading-tight">Emergency Assistance</p>
            </div>
          </div>

          {/* Center: Desktop Top Navigation Bar (Hidden on Mobile) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 bg-surface-raised/80 p-1 rounded-xl border border-border-subtle">
            <NavLink
              to="/citizen"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-surface text-accent-red shadow-xs font-bold'
                    : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                }`
              }
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </NavLink>

            <NavLink
              to="/citizen/emergency"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-surface text-accent-red shadow-xs font-bold'
                    : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                }`
              }
            >
              <div className="relative flex items-center">
                <AlertCircle className="w-3.5 h-3.5" />
                {activeEmergency && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-accent-red rounded-full ring-1 ring-surface animate-pulse" />
                )}
              </div>
              <span>Emergency</span>
            </NavLink>

            <NavLink
              to="/citizen/history"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-surface text-accent-red shadow-xs font-bold'
                    : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                }`
              }
            >
              <Clock className="w-3.5 h-3.5" />
              <span>History</span>
            </NavLink>

            <NavLink
              to="/citizen/notifications"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-surface text-accent-red shadow-xs font-bold'
                    : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                }`
              }
            >
              <div className="relative flex items-center">
                <Bell className="w-3.5 h-3.5" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-2 bg-accent-red text-white text-[9px] font-black rounded-full px-1 min-w-[14px] text-center leading-tight">
                    {unreadAlerts}
                  </span>
                )}
              </div>
              <span>Alerts</span>
            </NavLink>

            <NavLink
              to="/citizen/profile"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-surface text-accent-red shadow-xs font-bold'
                    : 'text-fg-muted hover:text-fg hover:bg-surface/50'
                }`
              }
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </NavLink>
          </nav>

          {/* Right Controls: Role Switcher Pill & Theme Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Demo Role Switcher Dropdown */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-surface-raised hover:bg-surface-raised/80 text-xs font-semibold text-fg transition-all shadow-sm"
                title="Switch Application Persona"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="hidden xs:inline">Role:</span>
                <span className="text-accent-red font-bold">Citizen</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-surface border border-border shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-fg-muted">
                    Switch Persona
                  </div>
                  {availableRoles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleSelect(r.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-raised transition-colors ${
                        r.id === currentRole ? 'bg-accent-red/10 text-accent-red font-bold' : 'text-fg'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-border-subtle flex items-center justify-center text-[10px] font-bold">
                          {r.userBadge}
                        </span>
                        <span>{r.label}</span>
                      </div>
                      {r.id === currentRole && <span className="text-[10px] uppercase font-bold text-accent-red">Active</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border bg-surface-raised hover:bg-surface text-fg-muted hover:text-fg transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
            </button>
          </div>
        </header>

        {/* Active Emergency Top Banner (if on Home or History, gently alerts user) */}
        {activeEmergency && location.pathname !== '/citizen/emergency' && (
          <div
            onClick={() => navigate('/citizen/emergency')}
            className="w-full bg-accent-red text-white px-4 sm:px-6 lg:px-8 py-2.5 text-xs font-semibold flex items-center justify-between cursor-pointer hover:bg-accent-red/90 transition-colors shadow-md animate-in slide-in-from-top duration-200"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>Active Emergency #{activeEmergency.id}: {activeEmergency.status}</span>
            </div>
            <span className="underline font-bold text-[11px]">Track Live →</span>
          </div>
        )}

        {/* =========================================================================
            2. MAIN CITIZEN VIEW AREA (Full Viewport Responsive Container)
            ========================================================================= */}
        <main className="flex-1 w-full overflow-y-auto min-h-0 relative">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        {/* =========================================================================
            3. MOBILE BOTTOM NAVIGATION BAR (Visible ONLY on Mobile < 768px)
            ========================================================================= */}
        <nav className="fixed bottom-0 left-0 right-0 w-full bg-surface/95 backdrop-blur-md border-t border-border-subtle z-40 px-2 py-1.5 flex items-center justify-around shadow-2xl md:hidden">
          {/* Home */}
          <NavLink
            to="/citizen"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors ${
                isActive ? 'text-accent-red font-bold' : 'text-fg-muted hover:text-fg'
              }`
            }
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Home</span>
          </NavLink>

          {/* My Emergency */}
          <NavLink
            to="/citizen/emergency"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors relative ${
                isActive ? 'text-accent-red font-bold' : 'text-fg-muted hover:text-fg'
              }`
            }
          >
            <div className="relative">
              <AlertCircle className="w-5 h-5 mb-0.5" />
              {activeEmergency && (
                <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-accent-red rounded-full ring-2 ring-surface animate-pulse" />
              )}
            </div>
            <span className="text-[10px] tracking-tight">Emergency</span>
          </NavLink>

          {/* History */}
          <NavLink
            to="/citizen/history"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors ${
                isActive ? 'text-accent-red font-bold' : 'text-fg-muted hover:text-fg'
              }`
            }
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">History</span>
          </NavLink>

          {/* Alerts / Notifications */}
          <NavLink
            to="/citizen/notifications"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors relative ${
                isActive ? 'text-accent-red font-bold' : 'text-fg-muted hover:text-fg'
              }`
            }
          >
            <div className="relative">
              <Bell className="w-5 h-5 mb-0.5" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-2 bg-accent-red text-white text-[9px] font-black rounded-full px-1 min-w-[14px] text-center leading-tight">
                  {unreadAlerts}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Alerts</span>
          </NavLink>

          {/* Profile */}
          <NavLink
            to="/citizen/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors ${
                isActive ? 'text-accent-red font-bold' : 'text-fg-muted hover:text-fg'
              }`
            }
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Profile</span>
          </NavLink>
        </nav>

        {/* Global Toast Alerts */}
        <ToastContainer />

        {/* Demo Simulation Controller */}
        <DemoLiveController />
      </div>
    </div>
  );
};
