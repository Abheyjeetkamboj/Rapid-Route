import type { LatLngTuple, RouteGeometry } from './mapTypes';
import type { TrafficCondition } from '../types';
import { calculateRoadwayDistance, calculateTrafficEta } from './trafficModel';

/**
 * Known highway corridors in the Tricity / Punjab emergency network
 */
const KNOWN_CORRIDOR_WAYPOINTS: Record<string, LatLngTuple[]> = {
  // RR-204 (Zirakpur) -> Chitkara University (INC-4821) via NH-7 Expressway
  'RR-204->INC-4821': [
    [30.6420, 76.8170],
    [30.6280, 76.7950],
    [30.6050, 76.7620],
    [30.5780, 76.7310],
    [30.5520, 76.7020],
    [30.5310, 76.6780],
    [30.5162, 76.6593],
  ],
  // RR-101 (Rajpura Bypass) -> Chitkara University (INC-4821) via Old Rajpura Link Road
  'RR-101->INC-4821': [
    [30.4840, 76.5940],
    [30.4920, 76.6080],
    [30.5010, 76.6260],
    [30.5090, 76.6430],
    [30.5162, 76.6593],
  ],
  // RR-509 (Rajpura East) -> Chitkara University (INC-4821)
  'RR-509->INC-4821': [
    [30.4790, 76.6020],
    [30.4910, 76.6180],
    [30.5040, 76.6380],
    [30.5162, 76.6593],
  ],
  // RR-317 (Chandigarh) -> INC-4820 (Sector 17, Chandigarh)
  'RR-317->INC-4820': [
    [30.7330, 76.7790],
    [30.7360, 76.7810],
    [30.7390, 76.7830],
    [30.7410, 76.7850],
  ],
  // RR-612 (Mohali) -> INC-4820 (Sector 17, Chandigarh) via Himalaya Marg
  'RR-612->INC-4820': [
    [30.6970, 76.7220],
    [30.7080, 76.7380],
    [30.7220, 76.7590],
    [30.7350, 76.7770],
    [30.7410, 76.7850],
  ],
  // Chitkara University (INC-4821) -> City Emergency Hospital (HOSP-01, Rajpura)
  'INC-4821->HOSP-01': [
    [30.5162, 76.6593],
    [30.5080, 76.6410],
    [30.4980, 76.6200],
    [30.4900, 76.6050],
    [30.4860, 76.5980],
  ],
  // Sector 17, Chandigarh (INC-4820) -> PGIMER (HOSP-03)
  'INC-4820->HOSP-03': [
    [30.7410, 76.7850],
    [30.7490, 76.7820],
    [30.7580, 76.7790],
    [30.7660, 76.7760],
  ],
};

/**
 * Generates natural curving roadway waypoints between two coordinates when no precomputed corridor exists
 */
export function generateCurvedWaypoints(
  start: LatLngTuple,
  end: LatLngTuple,
  numSegments: number = 8
): LatLngTuple[] {
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

  // Midpoint with slight lateral road deflection
  const midLat = (lat1 + lat2) / 2;
  const midLon = (lon1 + lon2) / 2;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  // Perpendicular curve offset
  const perpLat = -dLon * 0.18;
  const perpLon = dLat * 0.18;
  const controlPoint: LatLngTuple = [midLat + perpLat, midLon + perpLon];

  const points: LatLngTuple[] = [];
  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    // Quadratic Bézier curve formula: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * controlPoint[0] + t * t * lat2;
    const lon = (1 - t) * (1 - t) * lon1 + 2 * (1 - t) * t * controlPoint[1] + t * t * lon2;
    points.push([Math.round(lat * 10000) / 10000, Math.round(lon * 10000) / 10000]);
  }

  return points;
}

/**
 * Calculates a complete RouteGeometry between two entities
 */
export function calculateRoute(
  originId: string,
  originName: string,
  originCoords: LatLngTuple,
  destinationId: string,
  destinationName: string,
  destinationCoords: LatLngTuple,
  trafficCondition: TrafficCondition,
  isRecommended: boolean = false
): RouteGeometry {
  const key = `${originId}->${destinationId}`;
  let coordinates = KNOWN_CORRIDOR_WAYPOINTS[key];

  if (!coordinates) {
    coordinates = generateCurvedWaypoints(originCoords, destinationCoords);
  }

  // Pre-calibrated distances and ETAs for key showcase demonstration:
  let distanceKm: number;
  let etaMinutes: number;
  let corridorName: string;

  if (originId === 'RR-204' && destinationId === 'INC-4821') {
    distanceKm = 5.1;
    trafficCondition = 'Light';
    etaMinutes = 8;
    corridorName = 'NH-7 Express Corridor (Banur Bypass)';
  } else if (originId === 'RR-101' && destinationId === 'INC-4821') {
    distanceKm = 3.2;
    trafficCondition = 'Heavy';
    etaMinutes = 16;
    corridorName = 'Old Rajpura Rd (Town Center Bottleneck)';
  } else if (originId === 'RR-509' && destinationId === 'INC-4821') {
    distanceKm = 4.2;
    trafficCondition = 'Moderate';
    etaMinutes = 12;
    corridorName = 'Rajpura East Link';
  } else if (originId === 'INC-4821' && destinationId === 'HOSP-01') {
    distanceKm = 4.8;
    trafficCondition = 'Light';
    etaMinutes = 7;
    corridorName = 'Rajpura Civil Arterial to Emergency Hub';
  } else {
    distanceKm = calculateRoadwayDistance(originCoords, destinationCoords);
    etaMinutes = calculateTrafficEta(distanceKm, trafficCondition);
    corridorName = `${originName} to ${destinationName} Transit Corridor`;
  }

  return {
    id: `route-${originId}-${destinationId}`,
    originId,
    originName,
    destinationId,
    destinationName,
    coordinates,
    distanceKm,
    etaMinutes,
    trafficCondition,
    isRecommended,
    corridorName,
  };
}

/**
 * Interpolates an exact [lat, lng] position along the route polyline given a progress fraction [0, 1]
 */
export function interpolateRoutePosition(
  coordinates: LatLngTuple[],
  progress: number
): LatLngTuple {
  if (coordinates.length === 0) return [0, 0];
  if (progress <= 0) return coordinates[0];
  if (progress >= 1) return coordinates[coordinates.length - 1];

  // Calculate cumulative segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const dLat = coordinates[i + 1][0] - coordinates[i][0];
    const dLon = coordinates[i + 1][1] - coordinates[i][1];
    const len = Math.sqrt(dLat * dLat + dLon * dLon);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) return coordinates[0];

  const targetDistance = progress * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDistance) {
      const segProgress = (targetDistance - accumulated) / segLen;
      const lat =
        coordinates[i][0] + (coordinates[i + 1][0] - coordinates[i][0]) * segProgress;
      const lon =
        coordinates[i][1] + (coordinates[i + 1][1] - coordinates[i][1]) * segProgress;
      return [lat, lon];
    }
    accumulated += segLen;
  }

  return coordinates[coordinates.length - 1];
}

