import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
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
  const { emergencies, ambulanceFleet, hospitals, dispatchAmbulance } = useDispatchContext();

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
      // Find candidate units (eligible or near units to showcase comparison)
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

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1700px] mx-auto">
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

      {/* 2. MAP-FIRST TACTICAL SPLIT (70-75% Map / 25-30% Operations Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: 70-75% INTERACTIVE LEAFLET MAP (8 or 9 columns depending on screen) */}
        <div className="lg:col-span-8 xl:col-span-8">
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

        {/* RIGHT: 25-30% OPERATIONS SIDEBAR (4 columns) */}
        <div className="lg:col-span-4 xl:col-span-4">
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
    </div>
  );
}
