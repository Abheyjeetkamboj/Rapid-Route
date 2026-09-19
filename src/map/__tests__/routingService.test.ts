import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  calculateRoadwayDistance,
  calculateTrafficEta,
} from '../trafficModel';
import {
  calculateRoute,
  interpolateRoutePosition,
  generateCurvedWaypoints,
} from '../routingService';
import type { LatLngTuple } from '../mapTypes';

describe('RapidRoute Routing & Traffic Intelligence', () => {
  const coordA: LatLngTuple = [30.5162, 76.6593]; // Chitkara University
  const coordB: LatLngTuple = [30.6420, 76.8170]; // Zirakpur

  it('calculates accurate Haversine and roadway distances', () => {
    const straightLine = calculateHaversineDistance(coordA, coordB);
    expect(straightLine).toBeGreaterThan(15);
    expect(straightLine).toBeLessThan(25);

    const roadDistance = calculateRoadwayDistance(coordA, coordB);
    expect(roadDistance).toBeGreaterThan(straightLine);
  });

  it('calculates traffic-aware arrival ETAs using congestion factors', () => {
    const dist = 10;
    const lightEta = calculateTrafficEta(dist, 'Light');
    const moderateEta = calculateTrafficEta(dist, 'Moderate');
    const heavyEta = calculateTrafficEta(dist, 'Heavy');

    expect(lightEta).toBeLessThan(moderateEta);
    expect(moderateEta).toBeLessThan(heavyEta);
  });

  it('proves the core product premise: faster suitable ambulance beats closer congested ambulance', () => {
    // RR-101: 3.2 km in Heavy traffic
    const rr101Route = calculateRoute(
      'RR-101',
      'Rajpura',
      [30.484, 76.594],
      'INC-4821',
      'Chitkara University',
      [30.5162, 76.6593],
      'Heavy',
      false
    );

    // RR-204: 5.1 km in Light traffic
    const rr204Route = calculateRoute(
      'RR-204',
      'Zirakpur',
      [30.642, 76.817],
      'INC-4821',
      'Chitkara University',
      [30.5162, 76.6593],
      'Light',
      true
    );

    expect(rr204Route.distanceKm).toBeGreaterThan(rr101Route.distanceKm); // RR-204 is farther away (5.1 km vs 3.2 km)
    expect(rr204Route.etaMinutes).toBeLessThan(rr101Route.etaMinutes);    // but arrives in 8 min vs 16 min!
    expect(rr204Route.isRecommended).toBe(true);
  });

  it('generates multi-segment curved waypoints for road-following routes', () => {
    const waypoints = generateCurvedWaypoints(coordA, coordB, 8);
    expect(waypoints.length).toBe(9);
    expect(waypoints[0]).toEqual(coordA);
    expect(waypoints[waypoints.length - 1]).toEqual(coordB);
  });

  it('smoothly interpolates telemetry positions along route coordinates', () => {
    const path: LatLngTuple[] = [
      [30.0, 70.0],
      [30.0, 71.0],
      [30.0, 72.0],
    ];

    const start = interpolateRoutePosition(path, 0);
    expect(start).toEqual([30.0, 70.0]);

    const mid = interpolateRoutePosition(path, 0.5);
    expect(mid[0]).toBeCloseTo(30.0);
    expect(mid[1]).toBeCloseTo(71.0);

    const end = interpolateRoutePosition(path, 1.0);
    expect(end).toEqual([30.0, 72.0]);
  });
});
