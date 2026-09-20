import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  Activity,
  Truck,
  Navigation,
  MapPin,
  Shield,
} from 'lucide-react';
import {
  Button,
  StatusPill,
  PageHero,
  MetricCard,
  Drawer,
} from '../components/ui';
import { Ambulance, AmbulanceStatus } from '../types';
import { useDispatchContext } from '../context/DispatchContext';
import { statusLabel } from '../utils/formatters';

type FilterType = 'ALL' | AmbulanceStatus;

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: 'All Fleet', value: 'ALL' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'En Route', value: 'EN_ROUTE' },
  { label: 'Busy', value: 'BUSY' },
  { label: 'Offline', value: 'OFFLINE' },
];

export default function FleetPage() {
  const { ambulanceFleet } = useDispatchContext();
  const [searchParams] = useSearchParams();
  const queryAmbulanceId = searchParams.get('id');

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAmbulance, setSelectedAmbulance] = useState<Ambulance | null>(null);

  // Auto-select and open drawer if navigated with ?id=
  useEffect(() => {
    if (queryAmbulanceId) {
      const match = ambulanceFleet.find((a) => a.id.toLowerCase() === queryAmbulanceId.toLowerCase());
      if (match) {
        setSelectedAmbulance(match);
      }
    }
  }, [queryAmbulanceId, ambulanceFleet]);

  // Top metric counts
  const counts = useMemo(() => {
    return {
      total: ambulanceFleet.length,
      available: ambulanceFleet.filter((a) => a.status === 'AVAILABLE').length,
      enRoute: ambulanceFleet.filter((a) => a.status === 'EN_ROUTE').length,
      busy: ambulanceFleet.filter((a) => a.status === 'BUSY').length,
      offline: ambulanceFleet.filter((a) => a.status === 'OFFLINE').length,
    };
  }, [ambulanceFleet]);

  // Filtering with useMemo
  const filteredAmbulances = useMemo(() => {
    return ambulanceFleet.filter((ambulance) => {
      if (filter !== 'ALL' && ambulance.status !== filter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = ambulance.id.toLowerCase().includes(query);
        const matchesLocation = ambulance.currentArea.toLowerCase().includes(query);
        const matchesCapability = ambulance.capability.toLowerCase().includes(query);
        const matchesDriver = ambulance.driverName.toLowerCase().includes(query);
        return matchesId || matchesLocation || matchesCapability || matchesDriver;
      }
      return true;
    });
  }, [filter, searchQuery]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* 1. PAGE HERO */}
      <PageHero
        category="Fleet Operations"
        title="Ambulance Fleet Management"
        description="Monitor vehicle availability, crew readiness, real-time traffic delays, and capability tiers across all operational medical transit units."
        telemetryStatus="GPS SYNC ACTIVE"
        telemetryDot="green"
      />

      {/* 2. ELEVATED METRIC ROW */}
      <section aria-label="Fleet Status Summary" className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 sm:gap-4">
        <MetricCard
          label="Total Fleet"
          value={counts.total}
          icon={<Truck className="w-5 h-5 text-accent-blue" />}
          subtitle="Registered units"
          accentColor="blue"
          variant="secondary"
        />
        <MetricCard
          label="Available"
          value={counts.available}
          icon={<Truck className="w-5 h-5 text-status-available" />}
          subtitle="Ready for dispatch"
          accentColor="green"
          variant="primary"
          trend="Immediate"
          trendUp
        />
        <MetricCard
          label="En Route"
          value={counts.enRoute}
          icon={<Navigation className="w-5 h-5 text-status-enroute" />}
          subtitle="Responding"
          accentColor="amber"
          variant="secondary"
        />
        <MetricCard
          label="Busy"
          value={counts.busy}
          icon={<Activity className="w-5 h-5 text-accent-red" />}
          subtitle="At hospital / scene"
          accentColor="red"
          variant="secondary"
        />
        <MetricCard
          label="Offline"
          value={counts.offline}
          icon={<Truck className="w-5 h-5 text-status-offline" />}
          subtitle="Depot maintenance"
          variant="secondary"
        />
      </section>

      {/* 3. CONTROL BAR (Filter & Search) */}
      <section
        aria-label="Fleet Filter Bar"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border shadow-card"
      >
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-surface-overlay border border-border-subtle">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === opt.value
                  ? 'bg-surface text-fg font-bold shadow-xs'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vehicle ID, sector, crew..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface-overlay border border-border-subtle text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* 4. FLEET TABLE */}
      <section aria-label="Ambulance Fleet Table">
        <div className="rounded-xl border border-border bg-surface shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-overlay/50 border-b border-border-subtle text-[11px] font-semibold text-fg-muted uppercase tracking-wider">
                  <th scope="col" className="px-6 py-4">Ambulance ID</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4">Current Sector</th>
                  <th scope="col" className="px-6 py-4">Estimated ETA</th>
                  <th scope="col" className="px-6 py-4">Traffic Conditions</th>
                  <th scope="col" className="px-6 py-4">Medical Tier</th>
                  <th scope="col" className="px-6 py-4">Assigned Incident</th>
                  <th scope="col" className="px-6 py-4">Updated</th>
                  <th scope="col" className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-sm">
                {filteredAmbulances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-fg-muted text-xs">
                      No ambulance units match the specified filters.
                    </td>
                  </tr>
                ) : (
                  filteredAmbulances.map((amb) => {
                    const statusType =
                      amb.status === 'AVAILABLE'
                        ? 'AVAILABLE'
                        : amb.status === 'EN_ROUTE'
                        ? 'EN_ROUTE'
                        : amb.status === 'BUSY'
                        ? 'BUSY'
                        : 'OFFLINE';

                    return (
                      <tr
                        key={amb.id}
                        onClick={() => setSelectedAmbulance(amb)}
                        className="hover:bg-surface-overlay/60 transition-colors cursor-pointer group"
                      >
                        {/* ID */}
                        <td className="px-6 py-4 font-mono font-bold text-xs text-fg whitespace-nowrap">
                          <span className="group-hover:text-accent-blue transition-colors">
                            {amb.id}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusPill status={statusType} label={statusLabel(amb.status)} />
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4 text-fg font-medium">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-fg-faint" />
                            <span>{amb.currentArea}</span>
                          </div>
                        </td>

                        {/* ETA */}
                        <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                          {amb.etaMinutes !== null ? (
                            <span className="font-semibold text-status-available">
                              {amb.etaMinutes} min
                            </span>
                          ) : (
                            <span className="text-fg-faint">—</span>
                          )}
                        </td>

                        {/* Traffic */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {amb.trafficCondition ? (
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                amb.trafficCondition === 'Light'
                                  ? 'text-status-available'
                                  : amb.trafficCondition === 'Moderate'
                                  ? 'text-status-enroute'
                                  : 'text-accent-red'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  amb.trafficCondition === 'Light'
                                    ? 'bg-status-available'
                                    : amb.trafficCondition === 'Moderate'
                                    ? 'bg-status-enroute'
                                    : 'bg-accent-red'
                                }`}
                              />
                              {amb.trafficCondition}
                            </span>
                          ) : (
                            <span className="text-fg-faint text-xs">—</span>
                          )}
                        </td>

                        {/* Capability */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded bg-surface-overlay text-fg font-semibold text-xs border border-border-subtle">
                            {amb.capability}
                          </span>
                        </td>

                        {/* Assigned Incident */}
                        <td className="px-6 py-4 font-mono text-xs text-fg whitespace-nowrap">
                          {amb.assignedIncident ? (
                            <span className="text-accent-blue font-semibold">
                              {amb.assignedIncident}
                            </span>
                          ) : (
                            <span className="text-fg-faint font-sans">—</span>
                          )}
                        </td>

                        {/* Last Updated */}
                        <td className="px-6 py-4 font-mono text-xs text-fg-faint whitespace-nowrap">
                          {amb.lastUpdated}
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAmbulance(amb);
                            }}
                            className="text-xs text-accent-blue font-semibold"
                          >
                            Details →
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. AMBULANCE DETAIL DRAWER */}
      <Drawer
        open={!!selectedAmbulance}
        onClose={() => setSelectedAmbulance(null)}
        title={selectedAmbulance?.id || 'Ambulance Unit'}
        subtitle={`Stationed in ${selectedAmbulance?.currentArea}`}
        badge={
          selectedAmbulance && (
            <StatusPill
              status={
                selectedAmbulance.status === 'AVAILABLE'
                  ? 'AVAILABLE'
                  : selectedAmbulance.status === 'EN_ROUTE'
                  ? 'EN_ROUTE'
                  : selectedAmbulance.status === 'BUSY'
                  ? 'BUSY'
                  : 'OFFLINE'
              }
              size="sm"
            />
          )
        }
      >
        {selectedAmbulance && (
          <div className="space-y-6">
            {/* Quick telemetry snapshot */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-surface-raised border border-border-subtle">
                <span className="text-xs text-fg-muted block">Medical Tier</span>
                <span className="text-lg font-bold text-fg mt-1 block">
                  {selectedAmbulance.capability}
                </span>
                <span className="text-[11px] text-fg-faint">Certified Equipment</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-raised border border-border-subtle">
                <span className="text-xs text-fg-muted block">Arrival ETA</span>
                <span className="text-lg font-bold font-mono text-status-available mt-1 block">
                  {selectedAmbulance.etaMinutes ? `${selectedAmbulance.etaMinutes} min` : 'Standby'}
                </span>
                <span className="text-[11px] text-fg-faint">
                  Traffic: {selectedAmbulance.trafficCondition || 'Clear'}
                </span>
              </div>
            </div>

            {/* Crew & Specification Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Unit & Crew Roster
              </h3>
              <div className="divide-y divide-border-subtle rounded-xl bg-surface-raised border border-border-subtle text-xs">
                <div className="flex items-center justify-between p-3">
                  <span className="text-fg-muted">Assigned Driver / Paramedic</span>
                  <span className="font-semibold text-fg">{selectedAmbulance.driverName}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-fg-muted">Current Station / Sector</span>
                  <span className="font-semibold text-fg">{selectedAmbulance.currentArea}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-fg-muted">Assigned Incident</span>
                  <span className="font-mono text-accent-blue font-bold">
                    {selectedAmbulance.assignedIncident || 'None (In Pool)'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="text-fg-muted">Last GPS Beacon</span>
                  <span className="font-mono text-fg font-medium">{selectedAmbulance.lastUpdated} IST</span>
                </div>
              </div>
            </div>

            {/* Telemetry Notice */}
            <div className="p-4 rounded-xl bg-surface-raised border border-border-subtle space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-fg">
                <Shield className="w-4 h-4 text-accent-blue" />
                <span>Telemetry Subsystem</span>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                GPS telemetry, OBD-II vehicle health diagnostics, and route corridor tracking will be connected in future updates.
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
