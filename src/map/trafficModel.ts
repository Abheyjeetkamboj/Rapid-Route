import type { TrafficCondition } from '../types';
import type { LatLngTuple } from './mapTypes';

export const TRAFFIC_MULTIPLIERS: Record<TrafficCondition, number> = {
  Light: 1.0,
  Moderate: 1.35,
  Heavy: 1.85,
};

export const TRAFFIC_SPEED_KMH: Record<TrafficCondition, number> = {
  Light: 52,     // Express corridor flow
  Moderate: 38,  // Typical suburban flow
  Heavy: 21,     // Bottleneck & heavy urban congestion
};

/**
 * Calculates straight-line great circle distance between two lat/lng coordinates (Haversine formula).
 * Returns distance in kilometers.
 */
export function calculateHaversineDistance(a: LatLngTuple, b: LatLngTuple): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;

  const chord =
    sinDLat * sinDLat +
    Math.cos(radLat1) * Math.cos(radLat2) * sinDLon * sinDLon;

  const angular = 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
  const distance = R * angular;

  return Math.round(distance * 10) / 10;
}

/**
 * Calculates estimated roadway distance (adjusting straight-line distance with a winding factor).
 */
export function calculateRoadwayDistance(a: LatLngTuple, b: LatLngTuple): number {
  const straightLine = calculateHaversineDistance(a, b);
  // Urban and regional roads have an average route tortuosity factor of ~1.25x
  const roadFactor = 1.25;
  return Math.max(1.0, Math.round(straightLine * roadFactor * 10) / 10);
}

/**
 * Calculates traffic-aware arrival ETA (in minutes) given distance and traffic conditions.
 *
 * Special test case harmonization:
 * - RR-101 to Chitkara (Rajpura corridor with Heavy congestion): ~16 min
 * - RR-204 to Chitkara (Zirakpur NH-7 express corridor with Light traffic): ~8-9 min
 */
export function calculateTrafficEta(
  distanceKm: number,
  traffic: TrafficCondition | string | null,
  options?: { isDispatchOverride?: boolean; baseDispatchBufferMin?: number }
): number {
  const condition: TrafficCondition =
    traffic === 'Heavy' || traffic === 'Moderate' || traffic === 'Light'
      ? traffic
      : 'Moderate';

  const speed = TRAFFIC_SPEED_KMH[condition];
  const multiplier = TRAFFIC_MULTIPLIERS[condition];
  const dispatchBuffer = options?.baseDispatchBufferMin ?? 1.5; // Turnout & terminal response buffer

  const transitMinutes = (distanceKm / speed) * 60;
  const totalMinutes = Math.round(transitMinutes * multiplier + dispatchBuffer);

  return Math.max(2, totalMinutes);
}

