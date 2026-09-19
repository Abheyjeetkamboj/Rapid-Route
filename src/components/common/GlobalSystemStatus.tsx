import { useState } from 'react';
import { ShieldCheck, Activity, Database, Radio, MapPin, Sparkles, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDispatchContext } from '../../context/DispatchContext';

export function GlobalSystemStatus() {
  const { realtimeStatus, appMode } = useDispatchContext();
  const [isOpen, setIsOpen] = useState(false);

  // Compute aggregate system state
  let statusText = 'ALL SYSTEMS OPERATIONAL';
  let dotColor = 'bg-emerald-500';
  let badgeBorder = 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500';

  if (realtimeStatus === 'OFFLINE') {
    statusText = 'OFFLINE';
    dotColor = 'bg-rose-500';
    badgeBorder = 'border-rose-500/25 bg-rose-500/10 text-rose-500';
  } else if (realtimeStatus === 'RECONNECTING' || realtimeStatus === 'CONNECTING') {
    statusText = 'RECONNECTING';
    dotColor = 'bg-amber-500 animate-pulse';
    badgeBorder = 'border-amber-500/25 bg-amber-500/10 text-amber-500';
  } else if (appMode === 'DEMO') {
    statusText = 'DEMO MODE';
    dotColor = 'bg-amber-500';
    badgeBorder = 'border-amber-500/25 bg-amber-500/10 text-amber-500';
  }

  const subsystems = [
    {
      name: 'Dispatch Decision Engine',
      description: 'Deterministic clinical tier & ETA scoring',
      status: 'OPERATIONAL',
      icon: Activity,
    },
    {
      name: 'Hospital Coordination',
      description: 'HL7 pre-alert & bedside handover pipeline',
      status: 'OPERATIONAL',
      icon: ShieldCheck,
    },
    {
      name: 'Map & Telemetry Engine',
      description: 'Corridor progression & traffic ETA modeling',
      status: 'OPERATIONAL',
      icon: MapPin,
    },
    {
      name: 'Data Persistence Layer',
      description:
        appMode === 'CONNECTED'
          ? 'Connected to Supabase PostgreSQL'
          : 'Operating in LocalStorage persistent demo mode',
      status: appMode === 'CONNECTED' ? 'CONNECTED' : 'LOCAL DEMO',
      icon: Database,
    },
    {
      name: 'Real-Time Event Stream',
      description:
        realtimeStatus === 'LIVE'
          ? 'Active Supabase WebSocket CDC subscription'
          : 'Reactive TypedEventBus dispatch pipeline',
      status: realtimeStatus === 'LIVE' ? 'LIVE' : 'DEMO BUS',
      icon: Radio,
    },
    {
      name: 'AI Intake Assistant',
      description: 'Decision support triage extraction with human-in-the-loop verification',
      status: 'OPERATIONAL',
      icon: Sparkles,
    },
  ];

  return (
    <div className="relative">
      {/* Pill Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium shadow-xs transition-all hover:scale-105 ${badgeBorder}`}
        title="View Subsystem Health Diagnostics"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span>{statusText}</span>
      </button>

      {/* Diagnostics Popover Modal */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface border border-border shadow-2xl z-50 p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent-blue" />
                <h4 className="text-xs font-bold text-fg tracking-tight">System Health Diagnostics</h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-fg-muted hover:text-fg hover:bg-surface-raised transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Overall Status Banner */}
            <div className="p-2.5 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                <span className="font-mono font-bold text-fg">{statusText}</span>
              </div>
              <span className="text-[10px] font-mono text-fg-faint">
                {appMode === 'CONNECTED' ? 'PROD CLOUD' : 'LOCAL PROTOTYPE'}
              </span>
            </div>

            {/* Subsystems List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {subsystems.map((sub) => (
                <div
                  key={sub.name}
                  className="p-2.5 rounded-xl bg-surface/80 border border-border-subtle flex items-start gap-3 hover:bg-surface-raised transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-surface-raised border border-border-subtle text-accent-blue mt-0.5">
                    <sub.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-fg truncate">{sub.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-fg-muted mt-0.5 leading-tight">{sub.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Subsystem notice */}
            <div className="pt-2 border-t border-border-subtle flex items-center gap-1.5 text-[10px] text-fg-faint">
              <AlertCircle className="w-3 h-3 text-fg-muted flex-shrink-0" />
              <span>Prototype state: All operational decisions execute deterministically.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

