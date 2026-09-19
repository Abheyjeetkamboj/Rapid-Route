import { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Sliders,
  Bell,
  Map,
  Shield,
  Monitor,
} from 'lucide-react';
import {
  PageHero,
} from '../components/ui';
import { useTheme } from '../context/ThemeContext';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  id,
}: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full p-0.5 border border-border/40 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-accent-blue' : 'bg-surface-overlay'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  const [refreshInterval, setRefreshInterval] = useState<string>(() => {
    return localStorage.getItem('rapidroute-refresh-interval') || '10s';
  });
  const [severityFilter, setSeverityFilter] = useState<string>(() => {
    return localStorage.getItem('rapidroute-severity-filter') || 'All';
  });
  const [soundAlerts, setSoundAlerts] = useState<boolean>(() => {
    const stored = localStorage.getItem('rapidroute-sound-alerts');
    return stored !== null ? stored === 'true' : true;
  });

  const [emergencyAlerts, setEmergencyAlerts] = useState<boolean>(() => {
    const stored = localStorage.getItem('rapidroute-emergency-alerts');
    return stored !== null ? stored === 'true' : true;
  });
  const [fleetStatusChanges, setFleetStatusChanges] = useState<boolean>(() => {
    const stored = localStorage.getItem('rapidroute-fleet-status-changes');
    return stored !== null ? stored === 'true' : true;
  });
  const [hospitalCapacityUpdates, setHospitalCapacityUpdates] = useState<boolean>(() => {
    const stored = localStorage.getItem('rapidroute-hospital-capacity-updates');
    return stored !== null ? stored === 'true' : false;
  });

  const [defaultZoom, setDefaultZoom] = useState<string>(() => {
    return localStorage.getItem('rapidroute-default-zoom') || 'Region';
  });
  const [showTrafficOverlay, setShowTrafficOverlay] = useState<boolean>(() => {
    const stored = localStorage.getItem('rapidroute-show-traffic');
    return stored !== null ? stored === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('rapidroute-refresh-interval', refreshInterval);
  }, [refreshInterval]);

  useEffect(() => {
    localStorage.setItem('rapidroute-severity-filter', severityFilter);
  }, [severityFilter]);

  useEffect(() => {
    localStorage.setItem('rapidroute-sound-alerts', String(soundAlerts));
  }, [soundAlerts]);

  useEffect(() => {
    localStorage.setItem('rapidroute-emergency-alerts', String(emergencyAlerts));
  }, [emergencyAlerts]);

  useEffect(() => {
    localStorage.setItem('rapidroute-fleet-status-changes', String(fleetStatusChanges));
  }, [fleetStatusChanges]);

  useEffect(() => {
    localStorage.setItem('rapidroute-hospital-capacity-updates', String(hospitalCapacityUpdates));
  }, [hospitalCapacityUpdates]);

  useEffect(() => {
    localStorage.setItem('rapidroute-default-zoom', defaultZoom);
  }, [defaultZoom]);

  useEffect(() => {
    localStorage.setItem('rapidroute-show-traffic', String(showTrafficOverlay));
  }, [showTrafficOverlay]);

  return (
    <div className="p-6 md:p-8 max-w-[1000px] mx-auto space-y-8">
      {/* 1. PAGE HERO */}
      <PageHero
        category="Configuration"
        title="Platform Preferences"
        description="Customize operations room aesthetics, notification sound thresholds, telemetry refresh rates, and GIS map defaults."
        telemetryStatus="SETTINGS ACTIVE"
        telemetryDot="green"
      />

      {/* 2. SETTINGS SECTIONS */}
      <div className="space-y-6">
        {/* Appearance */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
            <Monitor className="w-5 h-5 text-accent-blue" />
            <div>
              <h2 className="text-base font-bold text-fg tracking-tight">Appearance & Theme</h2>
              <p className="text-xs text-fg-muted">Choose interface styling according to lighting conditions</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-sm font-semibold text-fg block">Display Mode</span>
              <span className="text-xs text-fg-muted">
                {theme === 'dark' ? 'Emergency dark mode active' : 'Clinical light mode active'}
              </span>
            </div>

            <div className="inline-flex rounded-xl p-1 bg-surface-overlay border border-border-subtle">
              <button
                type="button"
                onClick={() => theme === 'light' && toggleTheme()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  theme === 'dark'
                    ? 'bg-surface text-fg shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Dark Mode</span>
              </button>
              <button
                type="button"
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  theme === 'light'
                    ? 'bg-surface text-fg shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* Operations */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
            <Sliders className="w-5 h-5 text-accent-blue" />
            <div>
              <h2 className="text-base font-bold text-fg tracking-tight">Operations Console</h2>
              <p className="text-xs text-fg-muted">Telemetry polling intervals and triage triage filter defaults</p>
            </div>
          </div>

          <div className="divide-y divide-border-subtle text-sm">
            <div className="flex items-center justify-between py-3.5">
              <div>
                <span className="font-semibold text-fg block">Auto-refresh Interval</span>
                <span className="text-xs text-fg-muted">Frequency of GPS and ETA recalculations</span>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="bg-surface-overlay border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent-blue font-medium"
              >
                <option value="5s">5 seconds (High fidelity)</option>
                <option value="10s">10 seconds (Standard)</option>
                <option value="30s">30 seconds (Conserve bandwidth)</option>
                <option value="60s">60 seconds</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-3.5">
              <div>
                <span className="font-semibold text-fg block">Default Severity Filter</span>
                <span className="text-xs text-fg-muted">Preset triage level filter on incident queues</span>
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-surface-overlay border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent-blue font-medium"
              >
                <option value="All">All Severities</option>
                <option value="Critical">Critical Only</option>
                <option value="Urgent">Urgent Only</option>
                <option value="Routine">Routine Only</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-3.5">
              <div>
                <span className="font-semibold text-fg block">Sound Alerts</span>
                <span className="text-xs text-fg-muted">Audible tone on incoming critical triage CAD calls</span>
              </div>
              <ToggleSwitch checked={soundAlerts} onChange={setSoundAlerts} />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
            <Bell className="w-5 h-5 text-accent-blue" />
            <div>
              <h2 className="text-base font-bold text-fg tracking-tight">Real-time Notifications</h2>
              <p className="text-xs text-fg-muted">Desktop alerts for fleet status changes and hospital handovers</p>
            </div>
          </div>

          <div className="divide-y divide-border-subtle text-sm">
            <div className="flex items-center justify-between py-3.5">
              <div>
                <span className="font-semibold text-fg block">Emergency CAD Intake Alerts</span>
                <span className="text-xs text-fg-muted">High-priority alerts for new incoming 112 requests</span>
              </div>
              <ToggleSwitch checked={emergencyAlerts} onChange={setEmergencyAlerts} />
            </div>

            <div className="flex items-center justify-between py-3.5">
              <div>
                <span className="font-semibold text-fg block">Fleet Status Transitions</span>
                <span className="text-xs text-fg-muted">Notifies when ambulances transition from En Route to Available</span>
              </div>
              <ToggleSwitch checked={fleetStatusChanges} onChange={setFleetStatusChanges} />
            </div>

            <div className="flex items-center justify-between py-3.5">
              <div>
                <span className="font-semibold text-fg block">Hospital Capacity Diversion Alerts</span>
                <span className="text-xs text-fg-muted">Immediate notification when a facility switches to Diverting</span>
              </div>
              <ToggleSwitch checked={hospitalCapacityUpdates} onChange={setHospitalCapacityUpdates} />
            </div>
          </div>
        </div>

        {/* Map Defaults */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
            <Map className="w-5 h-5 text-accent-blue" />
            <div>
              <h2 className="text-base font-bold text-fg tracking-tight">GIS & Map Settings</h2>
              <p className="text-xs text-fg-muted">Map viewport defaults and layer visualizations</p>
            </div>
          </div>

          <div className="divide-y divide-border-subtle text-sm">
            <div className="flex items-center justify-between py-3.5">
              <div>
                <span className="font-semibold text-fg block">Default Zoom Sector</span>
                <span className="text-xs text-fg-muted">Initial bounding viewport for tactical operations</span>
              </div>
              <select
                value={defaultZoom}
                onChange={(e) => setDefaultZoom(e.target.value)}
                className="bg-surface-overlay border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-accent-blue font-medium"
              >
                <option value="City">City (5 km radius)</option>
                <option value="Region">Tricity Region (25 km radius)</option>
                <option value="State">State Corridor (100 km radius)</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-3.5">
              <div>
                <span className="font-semibold text-fg block">Live Arterial Traffic Overlay</span>
                <span className="text-xs text-fg-muted">Render real-time congestion corridors on tactical map</span>
              </div>
              <ToggleSwitch checked={showTrafficOverlay} onChange={setShowTrafficOverlay} />
            </div>
          </div>
        </div>

        {/* System Metadata */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-3">
            <Shield className="w-5 h-5 text-accent-blue" />
            <div>
              <h2 className="text-base font-bold text-fg tracking-tight">System Information</h2>
              <p className="text-xs text-fg-muted">Software deployment version and regional sector cluster</p>
            </div>
          </div>

          <div className="divide-y divide-border-subtle text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-fg-muted font-medium">Software Version</span>
              <span className="font-mono font-bold text-fg">0.2.0-STG1</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-fg-muted font-medium">Build Target</span>
              <span className="text-fg font-semibold">Production Prototype</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-fg-muted font-medium">Regional Sector</span>
              <span className="text-fg font-semibold">Tricity (Chandigarh-Rajpura-Zirakpur)</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-fg-muted font-medium">Dispatch Engine Status</span>
              <span className="font-mono text-status-available font-bold">READY FOR INTEGRATION</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
