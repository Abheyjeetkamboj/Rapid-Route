import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  Truck,
  AlertCircle,
  ArrowRight,
  Activity,
  Clock,
  Building2,
  Navigation,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { PageHero, Button } from '../components/ui';
import { useDispatchContext } from '../context/DispatchContext';
import { findBestAmbulance } from '../engine/dispatchEngine';
import { OperationsMap } from '../components/map/OperationsMap';
import { OperationsPanel } from '../components/map/OperationsPanel';
import { calculateRoute } from '../map/routingService';
import { getCoordinatesForIncident, getCoordinatesForHospital } from '../map/geoData';
import type { RouteGeometry, LatLngTuple } from '../map/mapTypes';

export default function LiveOperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { emergencies, ambulanceFleet, hospitals, dispatchAmbulance, activityEvents } = useDispatchContext();

  // Query parameter support: ?incidentId=INC-4821
  const queryIncidentId = searchParams.get('incidentId');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(() => {
    if (queryIncidentId && emergencies.some((e) => e.id === queryIncidentId)) {
      return queryIncidentId;
    }
    return emergencies[0]?.id || 'INC-4821';
  });

  // Keep query params synced when selecting incidents
  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setSearchParams({ incidentId: id });
    setSimulatedPos(null);
  };

  // Sync if URL changes externally
  useEffect(() => {
    if (queryIncidentId && emergencies.some((e) => e.id === queryIncidentId)) {
      setSelectedIncidentId(queryIncidentId);
    }
  }, [queryIncidentId, emergencies]);

  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>('RR-204');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>('HOSP-01');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Simulated telemetry state
  const [simulatedPos, setSimulatedPos] = useState<LatLngTuple | null>(null);

  const selectedIncident = useMemo(() => {
    return emergencies.find((e) => e.id === selectedIncidentId) || emergencies[0];
  }, [emergencies, selectedIncidentId]);

  // Run Dispatch Decision Engine for current incident
  const recommendation = useMemo(() => {
    if (!selectedIncident) return null;
    return findBestAmbulance(
      {
        id: selectedIncident.id,
        location: selectedIncident.location,
        emergencyType: selectedIncident.emergencyType,
        severity: selectedIncident.severity,
        patientCount: selectedIncident.patientCount,
        requiredCapability: selectedIncident.requiredCapability,
        notes: selectedIncident.notes,
      },
      ambulanceFleet
    );
  }, [selectedIncident, ambulanceFleet]);

  // Receiving hospital
  const receivingHospital = useMemo(() => {
    const targetHospId =
      selectedIncident?.selectedHospitalId ||
      selectedIncident?.recommendedHospital?.id ||
      'HOSP-01';
    return hospitals.find((h) => h.id === targetHospId) || hospitals[0];
  }, [selectedIncident, hospitals]);

  // Compute Route Geometries for the active incident & candidates
  const routes: RouteGeometry[] = useMemo(() => {
    if (!selectedIncident) return [];

    const incidentCoords = getCoordinatesForIncident(selectedIncident);
    const resultRoutes: RouteGeometry[] = [];

    // 1. Recommended ambulance route
    const recAmb = recommendation?.recommendedAmbulance;
    if (recAmb) {
      const recRoute = calculateRoute(
        recAmb.id,
        recAmb.currentArea,
        [recAmb.lat, recAmb.lng],
        selectedIncident.id,
        selectedIncident.location,
        incidentCoords,
        recAmb.trafficCondition || 'Light',
        true
      );
      resultRoutes.push(recRoute);
    }

    // 2. Alternative candidate routes (e.g. runner-up eligible or excluded close units)
    if (recommendation) {
      const otherCandidates = ambulanceFleet.filter(
        (a) => a.id !== recAmb?.id && (a.id === 'RR-101' || a.id === 'RR-509' || a.id === 'RR-317')
      );

      otherCandidates.slice(0, 2).forEach((cand) => {
        const candRoute = calculateRoute(
          cand.id,
          cand.currentArea,
          [cand.lat, cand.lng],
          selectedIncident.id,
          selectedIncident.location,
          incidentCoords,
          cand.trafficCondition || 'Moderate',
          false
        );
        resultRoutes.push(candRoute);
      });
    }

    // 3. Hospital transfer route (Incident -> Receiving Hospital)
    if (receivingHospital) {
      const hospCoords = getCoordinatesForHospital(receivingHospital.id);
      const hospRoute = calculateRoute(
        selectedIncident.id,
        selectedIncident.location,
        incidentCoords,
        receivingHospital.id,
        receivingHospital.name,
        hospCoords,
        'Light',
        false
      );
      resultRoutes.push(hospRoute);
    }

    return resultRoutes;
  }, [selectedIncident, recommendation, receivingHospital, ambulanceFleet]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDispatch = (ambulanceId: string) => {
    if (!selectedIncident) return;
    dispatchAmbulance(
      selectedIncident.id,
      ambulanceId,
      recommendation?.recommendedAmbulanceId || ambulanceId
    );
  };

  const handlePositionUpdate = (pos: LatLngTuple | null) => {
    setSimulatedPos(pos);
  };

  const assignedOrRecAmbulanceId =
    selectedIncident?.assignedAmbulance || recommendation?.recommendedAmbulanceId || 'RR-204';

  // Fleet count breakdown
  const fleetCounts = useMemo(() => {
    return {
      available: ambulanceFleet.filter((a) => a.status === 'AVAILABLE').length,
      enRoute: ambulanceFleet.filter((a) => a.status === 'EN_ROUTE').length,
      busy: ambulanceFleet.filter((a) => a.status === 'BUSY').length,
      offline: ambulanceFleet.filter((a) => a.status === 'OFFLINE').length,
    };
  }, [ambulanceFleet]);

  // Curated relevant units for quick view
  const relevantUnits = useMemo(() => {
    const assignedIds = emergencies
      .filter((e) => e.assignedAmbulance)
      .map((e) => e.assignedAmbulance as string);
    const recId = recommendation?.recommendedAmbulanceId;

    const prioritized = [...ambulanceFleet].sort((a, b) => {
      const aScore = (assignedIds.includes(a.id) ? 100 : 0) + (a.id === recId ? 50 : 0) + (a.status === 'EN_ROUTE' ? 20 : 0);
      const bScore = (assignedIds.includes(b.id) ? 100 : 0) + (b.id === recId ? 50 : 0) + (b.status === 'EN_ROUTE' ? 20 : 0);
      return bScore - aScore;
    });

    return prioritized.slice(0, 3);
  }, [ambulanceFleet, emergencies, recommendation]);

  // Active incidents list (top 3)
  const activeIncidents = useMemo(() => {
    return emergencies.filter((e) => e.status !== 'Completed').slice(0, 3);
  }, [emergencies]);

  // Dynamic Operational Activity stream
  const operationalTimeline = useMemo(() => {
    // Generate realistic chronological operational events based on active incidents
    const baseEvents = [
      {
        time: '03:04',
        title: 'RR-204 ETA updated',
        detail: '9 min → 8 min • Approaching Sector 32 corridor',
        category: 'ETA',
        badgeColor: 'text-status-available bg-status-available/10 border-status-available/20',
      },
      {
        time: '03:02',
        title: 'Hospital pre-alert acknowledged',
        detail: `${receivingHospital.name} Cath Lab & trauma resuscitation standby confirmed`,
        category: 'HOSPITAL',
        badgeColor: 'text-accent-blue bg-accent-blueSubtle text-accent-blue border-accent-blue/20',
      },
      {
        time: '03:00',
        title: 'RR-204 dispatched',
        detail: `Assigned to ${selectedIncident?.id || 'INC-8841'} (Chitkara University) by Officer S. Sharma`,
        category: 'DISPATCH',
        badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      },
      {
        time: '02:58',
        title: 'Dispatch recommendation generated',
        detail: 'Engine selected fastest suitable unit (9 min ETA beats 16 min closer unit)',
        category: 'ENGINE',
        badgeColor: 'text-fg-muted bg-surface-overlay border-border-subtle',
      },
    ];

    if (activityEvents && activityEvents.length > 0) {
      // Merge with persisted activity if available
      const dynamic = activityEvents.slice(0, 4).map((evt) => ({
        time: evt.timestamp.includes('T') ? evt.timestamp.split('T')[1]?.substring(0, 5) : evt.timestamp,
        title: evt.title,
        detail: evt.detail,
        category: evt.type,
        badgeColor: 'text-accent-blue bg-accent-blueSubtle border-accent-blue/20',
      }));
      return dynamic;
    }

    return baseEvents;
  }, [activityEvents, receivingHospital, selectedIncident]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1720px] mx-auto pb-28">
      {/* 1. PAGE HERO */}
      <PageHero
        category="GIS Telemetry & Dispatch Optimization"
        title="Live Operations & Route Intelligence"
        description="Real-time map situational awareness, dynamic route comparisons, and traffic-aware ETA intelligence across the Tricity regional corridor."
        telemetryStatus="MAP TELEMETRY ACTIVE"
        telemetryDot="green"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh Telemetry
          </Button>
        }
      />

      {/* 2. TOP SECTION: 12-COLUMN MAP & OPERATIONS SPLIT (8 cols Map / 4 cols Operations Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: 8 COLUMNS INTERACTIVE MAP */}
        <div className="lg:col-span-8">
          <OperationsMap
            emergencies={emergencies}
            ambulances={ambulanceFleet}
            hospitals={hospitals}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={handleSelectIncident}
            selectedAmbulanceId={selectedAmbulanceId}
            onSelectAmbulance={setSelectedAmbulanceId}
            selectedHospitalId={selectedHospitalId}
            onSelectHospital={setSelectedHospitalId}
            routes={routes}
            simulatedAmbulancePos={simulatedPos}
            simulatedAmbulanceId={assignedOrRecAmbulanceId}
            recommendedAmbulanceId={recommendation?.recommendedAmbulanceId}
          />
        </div>

        {/* RIGHT: 4 COLUMNS OPERATIONS PANEL (Scrollable container capped to map height) */}
        <div className="lg:col-span-4">
          <OperationsPanel
            emergencies={emergencies}
            selectedIncident={selectedIncident}
            onSelectIncident={handleSelectIncident}
            recommendation={recommendation}
            recommendedHospital={receivingHospital}
            routes={routes}
            onDispatch={handleDispatch}
            simulatedAmbulancePos={simulatedPos}
            onPositionUpdate={handlePositionUpdate}
          />
        </div>
      </div>

      {/* 3. ROW BELOW MAP: 3-COLUMN OPERATIONAL DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* A. FLEET STATUS */}
        <div className="rounded-xl border border-border bg-surface shadow-card p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-accent-blue" />
                <h3 className="text-sm font-bold text-fg tracking-tight">Fleet Status</h3>
              </div>
              <Link
                to="/fleet"
                className="text-xs font-semibold text-accent-blue hover:text-accent-blue/80 inline-flex items-center gap-1 transition-colors"
              >
                View Fleet <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Metric Summary Counters */}
            <div className="grid grid-cols-4 gap-2 pt-3 text-center">
              <div className="p-2 rounded-lg bg-surface-overlay border border-border-subtle">
                <span className="text-[10px] uppercase font-bold text-fg-faint block">Available</span>
                <span className="font-mono text-base font-bold text-status-available">
                  {fleetCounts.available}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-surface-overlay border border-border-subtle">
                <span className="text-[10px] uppercase font-bold text-fg-faint block">En Route</span>
                <span className="font-mono text-base font-bold text-status-enroute">
                  {fleetCounts.enRoute}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-surface-overlay border border-border-subtle">
                <span className="text-[10px] uppercase font-bold text-fg-faint block">Busy</span>
                <span className="font-mono text-base font-bold text-fg-muted">
                  {fleetCounts.busy}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-surface-overlay border border-border-subtle">
                <span className="text-[10px] uppercase font-bold text-fg-faint block">Offline</span>
                <span className="font-mono text-base font-bold text-fg-faint">
                  {fleetCounts.offline}
                </span>
              </div>
            </div>

            {/* Compact Relevant Units List */}
            <div className="mt-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted block">
                Priority Units
              </span>
              {relevantUnits.map((amb) => {
                const isRec = amb.id === recommendation?.recommendedAmbulanceId;
                const isEnRoute = amb.status === 'EN_ROUTE';

                return (
                  <div
                    key={amb.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                      isRec
                        ? 'bg-status-available/5 border-status-available/30'
                        : isEnRoute
                        ? 'bg-amber-500/5 border-amber-500/25'
                        : 'bg-surface-raised border-border-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-fg">{amb.id}</span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          amb.status === 'EN_ROUTE'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-status-available/10 text-status-available border border-status-available/20'
                        }`}
                      >
                        {amb.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-fg-muted font-medium">{amb.currentArea}</span>
                      <span className="font-mono font-bold text-fg text-xs">
                        {amb.etaMinutes ? `${amb.etaMinutes} min` : 'Standby'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* B. ACTIVE INCIDENTS */}
        <div className="rounded-xl border border-border bg-surface shadow-card p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-accent-red" />
                <h3 className="text-sm font-bold text-fg tracking-tight">Active Incidents</h3>
              </div>
              <Link
                to="/"
                className="text-xs font-semibold text-accent-blue hover:text-accent-blue/80 inline-flex items-center gap-1 transition-colors"
              >
                CAD Console <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Active Incident List */}
            <div className="mt-3 space-y-2.5">
              {activeIncidents.map((inc) => {
                const isSelected = inc.id === selectedIncidentId;
                const isCritical = inc.severity === 'Critical';

                return (
                  <div
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-accent-blue bg-accent-blueSubtle/15 shadow-xs ring-1 ring-accent-blue'
                        : 'border-border-subtle bg-surface-raised hover:border-border hover:bg-surface-overlay'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-fg">{inc.id}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            isCritical
                              ? 'bg-red-500/10 text-accent-red border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-status-available">
                        {inc.assignedAmbulance ? `Unit ${inc.assignedAmbulance}` : 'Needs Dispatch'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-fg-muted">
                      <span className="truncate max-w-[180px] text-fg font-medium">{inc.emergencyType}</span>
                      <span className="font-mono text-[11px] text-fg-faint">
                        {inc.etaMinutes ? `${inc.etaMinutes} min ETA` : 'Queued'}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[10px] text-fg-faint truncate">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{inc.location}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* C. ROUTE EVENTS / OPERATIONAL STATUS */}
        <div className="rounded-xl border border-border bg-surface shadow-card p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-status-available" />
                <h3 className="text-sm font-bold text-fg tracking-tight">Route & Telemetry Status</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-available/10 text-status-available font-bold border border-status-available/20">
                ACTIVE CORRIDOR
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {/* Speed over Distance Card */}
              <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-accent-blue font-bold text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Decision Engine Core Principle
                </div>
                <p className="text-fg-muted leading-relaxed">
                  "Fastest suitable ambulance, not simply nearest." RapidRoute dynamically accounts for arterial traffic delays along the Rajpura–Zirakpur corridor.
                </p>
              </div>

              {/* Receiving Hospital Facility Status */}
              <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-fg flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-accent-blue" />
                    {receivingHospital.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-status-available">
                    {receivingHospital.icuBedsAvailable} ICU Beds
                  </span>
                </div>
                <p className="text-[11px] text-fg-muted">
                  Pre-alert readiness:{' '}
                  <strong className="text-status-available">
                    {selectedIncident?.preAlert?.status || 'Active Standby'}
                  </strong>
                  . Clinical Cath Lab pre-activation configured.
                </p>
              </div>

              {/* Action Link to Live Telemetry */}
              <div className="pt-1">
                <Link
                  to={`/hospital-operations?hospitalId=${receivingHospital.id}`}
                  className="w-full py-2 px-3 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-border-subtle flex items-center justify-between text-xs font-semibold text-fg transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-accent-blue" />
                    Open Hospital Coordination Portal
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-fg-muted" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM SECTION: FULL-WIDTH OPERATIONAL ACTIVITY TIMELINE */}
      <div className="rounded-xl border border-border bg-surface shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-accent-blue" />
            <h3 className="text-sm font-bold text-fg tracking-tight uppercase">
              Operational Activity & Dispatch Audit
            </h3>
          </div>
          <span className="text-xs font-mono text-fg-muted">
            Live Tricity Stream • 4 Recent Events
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {operationalTimeline.map((item, index) => (
            <div
              key={index}
              className="p-3.5 rounded-lg bg-surface-raised border border-border-subtle space-y-2 relative"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-fg">{item.time}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${item.badgeColor}`}>
                  {item.category}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-fg">{item.title}</p>
                <p className="text-[11px] text-fg-muted mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
