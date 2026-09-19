import type { TrafficCondition, AmbulanceCapability, AmbulanceStatus } from '../types';

export type LatLngTuple = [number, number];

export type MapLayerFilter = 'ALL' | 'INCIDENTS' | 'FLEET' | 'HOSPITALS';

export interface RouteGeometry {
  id: string;
  originId: string;
  originName: string;
  destinationId: string;
  destinationName: string;
  coordinates: LatLngTuple[];
  distanceKm: number;
  etaMinutes: number;
  trafficCondition: TrafficCondition;
  isRecommended: boolean;
  corridorName: string;
}

export interface CandidateRouteComparison {
  ambulanceId: string;
  driverName: string;
  capability: AmbulanceCapability;
  status: AmbulanceStatus;
  distanceKm: number;
  trafficCondition: TrafficCondition;
  etaMinutes: number;
  isRecommended: boolean;
  score: number;
  route: RouteGeometry;
}

export interface TelemetryState {
  isActive: boolean;
  isPaused: boolean;
  progress: number; // 0 to 1
  currentPosition: LatLngTuple;
  remainingKm: number;
  remainingEtaMinutes: number;
  speedMultiplier: number;
}

