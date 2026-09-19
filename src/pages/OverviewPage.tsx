import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Truck,
  Building2,
  Clock,
  AlertTriangle,
  MapPin,
  ArrowUpRight,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import { useDispatchContext } from '../context/DispatchContext';
import { PageHero, MetricCard, StatusDot, Button } from '../components/ui';

export default function OverviewPage() {
  const { emergencies, ambulanceFleet, hospitals, activityEvents } = useDispatchContext();
  const navigate = useNavigate();

  // Metrics computation
  const activeEmergencies = useMemo(
    () => emergencies.filter((e) => e.status !== 'Completed'),
    [emergencies]
  );
  const criticalEmergencies = useMemo(
    () => activeEmergencies.filter((e) => e.severity === 'Critical'),
    [activeEmergencies]
  );
  const availableAmbulances = useMemo(
    () => ambulanceFleet.filter((a) => a.status === 'AVAILABLE'),
    [ambulanceFleet]
  );
  const enRouteAmbulances = useMemo(
    () => ambulanceFleet.filter((a) => a.status === 'EN_ROUTE'),
    [ambulanceFleet]
  );
  const readyHospitals = useMemo(
    () => hospitals.filter((h) => h.emergencyStatus === 'ready' || h.edStatus === 'Ready'),
    [hospitals]
  );

  const averageResponseTime = '8.4 min';

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* 1. PAGE HERO */}
      <PageHero
        category="Operations Command Center"
        title="Network Operations Overview"
        description="Real-time municipal emergency response network overview, ambulance fleet distribution, and hospital intake readiness."
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowUpRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/analytics')}
            >
              Analytics Intelligence
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Navigation className="w-3.5 h-3.5" />}
              onClick={() => navigate('/live-operations')}
            >
              Open Live Operations Map
            </Button>
          </div>
        }
      />

      {/* 2. TOP 5 NETWORK METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Active Emergencies"
          value={activeEmergencies.length.toString()}
          subtitle={`${criticalEmergencies.length} Critical incidents active`}
          icon={<AlertTriangle className="w-4 h-4 text-accent-red" />}
          accentColor="red"
        />
        <MetricCard
          label="Available Ambulances"
          value={availableAmbulances.length.toString()}
          subtitle={`${ambulanceFleet.filter((a) => a.status === 'AVAILABLE' && a.capability.includes('ALS')).length} ALS units ready`}
          icon={<Truck className="w-4 h-4 text-status-available" />}
          accentColor="green"
        />
        <MetricCard
          label="Ambulances En Route"
          value={enRouteAmbulances.length.toString()}
          subtitle="Deployments in active corridor"
          icon={<Navigation className="w-4 h-4 text-accent-blue" />}
          accentColor="blue"
        />
        <MetricCard
          label="Average Response Time"
          value={averageResponseTime}
          subtitle="Call to on-scene arrival (SLA < 10m)"
          icon={<Clock className="w-4 h-4 text-status-available" />}
          accentColor="green"
        />
        <MetricCard
          label="Hospitals Ready"
          value={`${readyHospitals.length} / ${hospitals.length}`}
          subtitle={`${hospitals.reduce((acc, h) => acc + h.icuBedsAvailable, 0)} ICU beds available`}
          icon={<Building2 className="w-4 h-4 text-purple-400" />}
          accentColor="blue"
        />
      </div>

      {/* 3. CRITICAL INCIDENTS & FLEET SNAPSHOT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Incidents Queue Snapshot (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-surface border border-border-subtle shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-redSubtle flex items-center justify-center text-accent-red">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg tracking-tight">Active Emergency Incidents</h3>
                <p className="text-[11px] text-fg-muted font-mono">Current priority queue overview</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/live-operations')}
              className="text-xs font-semibold text-accent-blue hover:underline flex items-center gap-1"
            >
              <span>View Map</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-border-subtle overflow-x-auto">
            {activeEmergencies.length === 0 ? (
              <div className="p-8 text-center text-xs text-fg-muted">
                No active emergencies in municipal queue.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-raised/50 border-b border-border-subtle text-[11px] font-mono text-fg-faint uppercase">
                    <th className="py-2.5 px-4 font-semibold">Incident</th>
                    <th className="py-2.5 px-4 font-semibold">Location</th>
                    <th className="py-2.5 px-4 font-semibold">Severity</th>
                    <th className="py-2.5 px-4 font-semibold">Status / Unit</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {activeEmergencies.slice(0, 5).map((inc) => (
                    <tr key={inc.id} className="hover:bg-surface-raised/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-fg">{inc.id}</div>
                        <div className="text-[11px] text-fg-muted truncate max-w-[140px]">
                          {inc.emergencyType}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-fg font-medium truncate max-w-[180px]">{inc.location}</div>
                        <div className="text-[11px] text-fg-faint font-mono">{inc.reportedAt}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                            inc.severity === 'Critical'
                              ? 'bg-accent-redSubtle text-accent-red border border-accent-red/30'
                              : inc.severity === 'Urgent'
                              ? 'bg-accent-amberSubtle text-status-enroute border border-status-enroute/30'
                              : 'bg-accent-blueSubtle text-accent-blue border border-accent-blue/30'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-fg">
                          <StatusDot
                            color={inc.assignedAmbulance ? 'blue' : 'amber'}
                            pulse={!inc.assignedAmbulance}
                            size="xs"
                          />
                          <span>{inc.assignedAmbulance ? inc.assignedAmbulance : 'Awaiting Dispatch'}</span>
                        </div>
                        {inc.etaMinutes && (
                          <span className="text-[10px] font-mono text-fg-muted">ETA: {inc.etaMinutes}m</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate(`/live-operations?incidentId=${inc.id}`)}
                          className="px-2 py-1 rounded bg-surface-raised hover:bg-surface border border-border-subtle text-[11px] font-semibold text-accent-blue transition-all"
                        >
                          Track
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Fleet Distribution Snapshot (1 Col) */}
        <div className="rounded-2xl bg-surface border border-border-subtle shadow-sm p-5 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-status-available" />
                <h3 className="text-sm font-bold text-fg tracking-tight">Fleet Readiness</h3>
              </div>
              <button
                onClick={() => navigate('/fleet')}
                className="text-xs font-semibold text-accent-blue hover:underline flex items-center gap-1"
              >
                <span>Fleet Hub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-fg-muted">Available for Dispatch</span>
                  <span className="font-mono font-bold text-status-available">
                    {availableAmbulances.length} ({Math.round((availableAmbulances.length / ambulanceFleet.length) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden border border-border-subtle">
                  <div
                    style={{ width: `${(availableAmbulances.length / ambulanceFleet.length) * 100}%` }}
                    className="h-full bg-status-available rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-fg-muted">Active En Route</span>
                  <span className="font-mono font-bold text-accent-blue">
                    {enRouteAmbulances.length} ({Math.round((enRouteAmbulances.length / ambulanceFleet.length) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden border border-border-subtle">
                  <div
                    style={{ width: `${(enRouteAmbulances.length / ambulanceFleet.length) * 100}%` }}
                    className="h-full bg-accent-blue rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-fg-muted">Offline / In Reserve</span>
                  <span className="font-mono font-bold text-fg-muted">
                    {ambulanceFleet.filter((a) => a.status === 'OFFLINE').length} units
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden border border-border-subtle">
                  <div
                    style={{
                      width: `${(ambulanceFleet.filter((a) => a.status === 'OFFLINE').length / ambulanceFleet.length) * 100}%`,
                    }}
                    className="h-full bg-fg-faint rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-raised border border-border-subtle text-xs space-y-1">
            <div className="font-semibold text-fg flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-blue" />
              <span>ALS Triage Capability</span>
            </div>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              {ambulanceFleet.filter((a) => a.capability.includes('ALS')).length} of {ambulanceFleet.length} vehicles equipped for Advanced Life Support & Cardiac telemetry.
            </p>
          </div>
        </div>
      </div>

      {/* 4. LIVE MAP CORRIDOR PREVIEW & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Operations Corridor Preview (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-surface border border-border-subtle shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-accent-blue" />
              <div>
                <h3 className="text-sm font-bold text-fg tracking-tight">Active Operations Corridors</h3>
                <p className="text-[11px] text-fg-muted font-mono">Live GPS telemetry & route status</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowUpRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/live-operations')}
            >
              Launch Live Operations Map
            </Button>
          </div>

          {/* Quick Corridor Snapshot Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {enRouteAmbulances.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-xs text-fg-muted bg-surface-raised/40 rounded-xl border border-dashed border-border-subtle">
                No active ambulances currently navigating emergency corridors.
              </div>
            ) : (
              enRouteAmbulances.map((amb) => (
                <div
                  key={amb.id}
                  onClick={() => navigate(`/live-operations?incidentId=${amb.assignedIncident}`)}
                  className="p-4 rounded-xl bg-surface-raised/60 hover:bg-surface-raised border border-border-subtle transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-fg group-hover:text-accent-blue">
                      {amb.id} · {amb.driverName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent-blueSubtle text-accent-blue">
                      ETA {amb.etaMinutes || 7}m
                    </span>
                  </div>
                  <div className="text-xs text-fg-muted">
                    Assigned: <span className="font-mono font-semibold text-fg">{amb.assignedIncident}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-fg-faint">
                    <MapPin className="w-3 h-3 text-accent-red" />
                    <span className="truncate">{amb.currentArea}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Operational Activity (1 Col) */}
        <div className="rounded-2xl bg-surface border border-border-subtle shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-blue" />
              <h3 className="text-sm font-bold text-fg tracking-tight">Recent Activity Stream</h3>
            </div>
            <span className="text-[10px] font-mono text-fg-faint">Live Audit</span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {activityEvents.slice(0, 6).map((evt) => (
              <div key={evt.id} className="text-xs space-y-1 border-l-2 border-border-subtle pl-3 relative">
                <div className="flex items-center justify-between text-[10px] font-mono text-fg-faint">
                  <span>{evt.timestamp}</span>
                  <span className="uppercase text-[9px] text-fg-muted font-bold">{evt.type}</span>
                </div>
                <h5 className="font-semibold text-fg tracking-tight">{evt.title}</h5>
                <p className="text-[11px] text-fg-muted leading-tight">{evt.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
