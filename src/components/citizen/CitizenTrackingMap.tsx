import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { ActiveEmergency, Ambulance, Hospital } from '../../types';
import type { LatLngTuple, RouteGeometry } from '../../map/mapTypes';
import {
  TRICITY_CENTER,
  DEFAULT_MAP_ZOOM,
  getCoordinatesForIncident,
  getCoordinatesForHospital,
} from '../../map/geoData';
import { IncidentMarker } from '../map/IncidentMarker';
import { AmbulanceMarker } from '../map/AmbulanceMarker';
import { HospitalMarker } from '../map/HospitalMarker';
import { RouteLayer } from '../map/RouteLayer';
import { calculateRoute } from '../../map/routingService';

interface CitizenTrackingMapProps {
  incident: ActiveEmergency;
  ambulance?: Ambulance | null;
  hospital?: Hospital | null;
  className?: string;
}

const CitizenMapBoundsController: React.FC<{
  points: LatLngTuple[];
}> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }

    try {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 15,
        animate: true,
      });
    } catch (e) {
      console.warn('[CitizenTrackingMap] Bounds fitting error:', e);
    }
  }, [map, points]);

  return null;
};

export const CitizenTrackingMap: React.FC<CitizenTrackingMapProps> = ({
  incident,
  ambulance,
  hospital,
  className = 'h-72 sm:h-96 w-full',
}) => {
  // 1. Patient Coordinates
  const patientCoords = useMemo<LatLngTuple>(() => {
    return getCoordinatesForIncident(incident);
  }, [incident]);

  // 2. Ambulance Coordinates
  const ambulanceCoords = useMemo<LatLngTuple | null>(() => {
    if (!ambulance) return null;
    return [ambulance.lat, ambulance.lng];
  }, [ambulance]);

  // 3. Hospital Coordinates
  const hospitalCoords = useMemo<LatLngTuple | null>(() => {
    if (!hospital) return null;
    return getCoordinatesForHospital(hospital.id);
  }, [hospital]);

  // 4. Routes
  const routes = useMemo<RouteGeometry[]>(() => {
    const list: RouteGeometry[] = [];

    // Route from assigned ambulance to patient
    if (ambulance && ambulanceCoords) {
      const ambRoute = calculateRoute(
        ambulance.id,
        ambulance.driverName || ambulance.id,
        ambulanceCoords,
        incident.id,
        incident.location,
        patientCoords,
        ambulance.trafficCondition || 'Light',
        true
      );
      list.push(ambRoute);
    }

    // Route from patient to confirmed hospital
    if (hospital && hospitalCoords) {
      const hospRoute = calculateRoute(
        incident.id,
        incident.location,
        patientCoords,
        hospital.id,
        hospital.name,
        hospitalCoords,
        'Light',
        true
      );
      list.push(hospRoute);
    }

    return list;
  }, [ambulance, ambulanceCoords, patientCoords, hospital, hospitalCoords, incident.id, incident.location]);

  // Points for bounds fitting
  const boundsPoints = useMemo<LatLngTuple[]>(() => {
    const pts: LatLngTuple[] = [patientCoords];
    if (ambulanceCoords) pts.push(ambulanceCoords);
    if (hospitalCoords) pts.push(hospitalCoords);
    return pts;
  }, [patientCoords, ambulanceCoords, hospitalCoords]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border bg-surface-raised shadow-sm ${className}`}>
      <MapContainer
        center={patientCoords || TRICITY_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        className="h-full w-full z-0"
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        {/* Dynamic bounds controller */}
        <CitizenMapBoundsController points={boundsPoints} />

        {/* Connecting route line */}
        <RouteLayer routes={routes} />

        {/* Patient marker */}
        <IncidentMarker
          incident={incident}
          position={patientCoords}
          isSelected={true}
          onSelect={() => {}}
        />

        {/* Assigned ambulance marker (only assigned ambulance, no fleet clutter) */}
        {ambulance && ambulanceCoords && (
          <AmbulanceMarker
            ambulance={ambulance}
            positionOverride={ambulanceCoords}
            isSelected={true}
            isRecommended={true}
            onSelect={() => {}}
          />
        )}

        {/* Receiving hospital marker (when confirmed) */}
        {hospital && hospitalCoords && (
          <HospitalMarker
            hospital={hospital}
            position={hospitalCoords}
            isSelected={true}
            onSelect={() => {}}
          />
        )}
      </MapContainer>

      {/* Floating status chip */}
      <div className="absolute top-3 left-3 z-[400] bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border-subtle shadow-sm flex items-center gap-2 text-xs font-medium text-fg">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>{ambulance ? `Tracking Ambulance ${ambulance.id}` : 'Locating Nearest Emergency Unit'}</span>
      </div>
    </div>
  );
};

