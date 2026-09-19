import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Compass,
  Maximize2,
  Minimize2,
  Crosshair,
} from 'lucide-react';
import type {
  ActiveEmergency,
  Ambulance,
  Hospital,
} from '../../types';
import type {
  LatLngTuple,
  RouteGeometry,
  MapLayerFilter,
} from '../../map/mapTypes';
import {
  TRICITY_CENTER,
  DEFAULT_MAP_ZOOM,
  getCoordinatesForIncident,
  getCoordinatesForHospital,
} from '../../map/geoData';
import { IncidentMarker } from './IncidentMarker';
import { AmbulanceMarker } from './AmbulanceMarker';
import { HospitalMarker } from './HospitalMarker';
import { RouteLayer } from './RouteLayer';
import { MapLegend } from './MapLegend';

interface OperationsMapProps {
  emergencies: ActiveEmergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  selectedIncidentId: string;
  onSelectIncident: (id: string) => void;
  selectedAmbulanceId?: string | null;
  onSelectAmbulance: (id: string) => void;
  selectedHospitalId?: string | null;
  onSelectHospital: (id: string) => void;
  routes: RouteGeometry[];
  simulatedAmbulancePos?: LatLngTuple | null;
  simulatedAmbulanceId?: string | null;
  recommendedAmbulanceId?: string | null;
}

// Inner component to handle dynamic zooming & bounds fitting
const MapBoundsController: React.FC<{
  boundsPoints: LatLngTuple[];
  triggerKey: string;
}> = ({ boundsPoints, triggerKey }) => {
  const map = useMap();

  useEffect(() => {
    if (boundsPoints.length === 0) return;

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 13, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(boundsPoints.map((p) => [p[0], p[1]]));
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 13,
      animate: true,
    });
  }, [map, triggerKey]);

  return null;
};

export const OperationsMap: React.FC<OperationsMapProps> = ({
  emergencies,
  ambulances,
  hospitals,
  selectedIncidentId,
  onSelectIncident,
  selectedAmbulanceId,
  onSelectAmbulance,
  selectedHospitalId,
  onSelectHospital,
  routes,
  simulatedAmbulancePos,
  simulatedAmbulanceId,
  recommendedAmbulanceId,
}) => {
  const [activeFilter, setActiveFilter] = useState<MapLayerFilter>('ALL');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fitCounter, setFitCounter] = useState<number>(0);

  // Active selected incident
  const activeIncident = useMemo(() => {
    return emergencies.find((e) => e.id === selectedIncidentId) || emergencies[0];
  }, [emergencies, selectedIncidentId]);

  // Coordinates for active incident
  const activeIncidentCoords = useMemo(() => {
    return activeIncident ? getCoordinatesForIncident(activeIncident) : TRICITY_CENTER;
  }, [activeIncident]);

  // Calculate bounding points for the active incident + candidate ambulances + receiving hospital
  const boundsPoints = useMemo(() => {
    const points: LatLngTuple[] = [];

    if (activeIncidentCoords) {
      points.push(activeIncidentCoords);
    }

    // Add candidate ambulance coords from routes
    routes.forEach((r) => {
      if (r.coordinates.length > 0) {
        points.push(r.coordinates[0]);
      }
    });

    // If no routes, add nearby ambulances
    if (points.length <= 1) {
      ambulances.slice(0, 3).forEach((amb) => {
        points.push([amb.lat, amb.lng]);
      });
    }

    return points;
  }, [activeIncidentCoords, routes, ambulances]);

  const handleRecenter = () => {
    setFitCounter((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow-card overflow-hidden transition-all flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-[9999]' : 'relative min-h-[640px] h-[640px]'
      }`}
    >
      {/* Map Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border bg-surface-overlay/50 z-10">
        <div className="flex items-center gap-2.5">
          <Compass className="w-4 h-4 text-accent-blue" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-fg">
            Tricity Regional GIS • 30.58° N, 76.72° E
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-status-available/10 text-status-available border border-status-available/20">
            <span className="w-1.5 h-1.5 rounded-full bg-status-available animate-pulse" />
            LIVE TELEMETRY
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Layer Filter Toggles */}
          <div className="inline-flex rounded-lg p-0.5 bg-surface border border-border-subtle text-xs font-medium text-fg-muted shadow-xs">
            {(['ALL', 'INCIDENTS', 'FLEET', 'HOSPITALS'] as const).map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => setActiveFilter(filterKey)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  activeFilter === filterKey
                    ? 'bg-accent-blue text-white shadow-xs'
                    : 'hover:text-fg'
                }`}
              >
                {filterKey === 'ALL'
                  ? 'All Layers'
                  : filterKey === 'INCIDENTS'
                  ? 'Incidents'
                  : filterKey === 'FLEET'
                  ? 'Ambulances'
                  : 'Hospitals'}
              </button>
            ))}
          </div>

          {/* Recenter button */}
          <button
            type="button"
            onClick={handleRecenter}
            className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-overlay text-fg-muted hover:text-fg transition-colors shadow-xs"
            title="Recenter Map on Active Incident & Candidates"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Fullscreen button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-overlay text-fg-muted hover:text-fg transition-colors shadow-xs"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Leaflet Map View */}
      <div className="relative flex-1 w-full h-full min-h-[500px]">
        <MapContainer
          center={activeIncidentCoords}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          {/* CartoDB Voyager clean tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {/* Dynamic Auto-Bounds Controller */}
          <MapBoundsController
            boundsPoints={boundsPoints}
            triggerKey={`${selectedIncidentId}-${fitCounter}`}
          />

          {/* Route polylines */}
          <RouteLayer
            routes={routes}
            selectedRouteId={null}
          />

          {/* Incident Markers */}
          {(activeFilter === 'ALL' || activeFilter === 'INCIDENTS') &&
            emergencies.map((inc) => {
              const pos = getCoordinatesForIncident(inc);
              return (
                <IncidentMarker
                  key={inc.id}
                  incident={inc}
                  position={pos}
                  isSelected={inc.id === selectedIncidentId}
                  onSelect={onSelectIncident}
                />
              );
            })}

          {/* Ambulance Markers */}
          {(activeFilter === 'ALL' || activeFilter === 'FLEET') &&
            ambulances.map((amb) => {
              const isSimulated = simulatedAmbulanceId === amb.id && simulatedAmbulancePos !== null;
              const posOverride = isSimulated ? simulatedAmbulancePos : null;
              const isRec = recommendedAmbulanceId === amb.id;

              return (
                <AmbulanceMarker
                  key={amb.id}
                  ambulance={amb}
                  positionOverride={posOverride}
                  isRecommended={isRec}
                  isSelected={selectedAmbulanceId === amb.id}
                  onSelect={onSelectAmbulance}
                />
              );
            })}

          {/* Hospital Markers */}
          {(activeFilter === 'ALL' || activeFilter === 'HOSPITALS') &&
            hospitals.map((hosp) => {
              const pos = getCoordinatesForHospital(hosp.id);
              return (
                <HospitalMarker
                  key={hosp.id}
                  hospital={hosp}
                  position={pos}
                  isSelected={selectedHospitalId === hosp.id}
                  onSelect={onSelectHospital}
                />
              );
            })}
        </MapContainer>

        {/* Tactical Legend overlay */}
        <MapLegend />

        {/* Prototype attribution footnote */}
        <div className="absolute bottom-4 right-4 z-[1000] px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-md border border-border text-[10px] font-mono text-fg-muted shadow-card pointer-events-none">
          GIS Engine: Leaflet + CARTO Vector Grid • Route Corridor ETA
        </div>
      </div>
    </div>
  );
};
