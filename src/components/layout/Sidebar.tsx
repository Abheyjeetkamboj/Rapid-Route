import { NavLink } from 'react-router-dom';
import {
  PhoneCall,
  Map,
  Truck,
  Building2,
  BarChart3,
  Settings,
  Activity,
} from 'lucide-react';
import { StatusDot } from '../ui';

const navItems = [
  { to: '/', label: 'Emergency Calls', icon: PhoneCall, badge: '4' },
  { to: '/live-operations', label: 'Live Operations', icon: Map, badge: 'LIVE' },
  { to: '/fleet', label: 'Ambulance Fleet', icon: Truck, badge: null },
  { to: '/hospitals', label: 'Hospitals', icon: Building2, badge: null },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, badge: null },
  { to: '/settings', label: 'Settings', icon: Settings, badge: null },
];

export function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 h-screen sticky top-0 flex flex-col bg-sidebar-bg border-r border-sidebar-border select-none z-30 transition-colors">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-red to-red-700 flex items-center justify-center shadow-sm flex-shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-fg tracking-tight">RAPIDROUTE</span>
              <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-accent-blueSubtle text-accent-blue font-mono">
                AI
              </span>
            </div>
            <p className="text-[11px] text-fg-faint truncate font-medium">
              Emergency Dispatch Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="px-3 pt-4 pb-2">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-fgMuted mb-2">
          Dispatch Console
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-sidebar-active text-fg font-semibold shadow-xs'
                    : 'text-sidebar-fgMuted hover:text-sidebar-fg hover:bg-sidebar-hover'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Active pill indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent-red" />
                    )}
                    <item.icon
                      className={`w-[18px] h-[18px] transition-colors ${
                        isActive ? 'text-accent-red' : 'text-sidebar-fgMuted group-hover:text-sidebar-fg'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-medium rounded ${
                        item.badge === 'LIVE'
                          ? 'bg-accent-greenSubtle text-status-available font-semibold'
                          : 'bg-accent-redSubtle text-accent-red font-bold'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Principle Callout */}
      <div className="mx-3 my-auto p-3.5 rounded-xl bg-surface/70 border border-border-subtle text-[11px] leading-relaxed text-fg-muted">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-fg-faint mb-1">
          Dispatch Principle
        </p>
        <p className="text-fg-muted italic">
          &ldquo;Fastest suitable ambulance, not simply nearest ambulance.&rdquo;
        </p>
      </div>

      {/* Dispatcher Footer */}
      <div className="p-3 border-t border-sidebar-border/60 bg-sidebar-bg">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-hover transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-surface-raised border border-border flex items-center justify-center text-xs font-semibold text-fg flex-shrink-0 shadow-xs">
              SS
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-fg truncate">Officer S. Sharma</p>
              <p className="text-[11px] text-fg-faint truncate font-mono">EOC Dispatcher #4</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pl-2 flex-shrink-0">
            <StatusDot color="green" pulse size="sm" />
            <span className="text-[10px] font-mono text-status-available uppercase">ON DUTY</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
