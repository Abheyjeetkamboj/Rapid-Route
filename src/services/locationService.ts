import type { PatientLocation } from '../types';

/**
 * Deterministic regional demo locations for Tricity & Punjab emergency corridors.
 * Used when no external commercial geocoding service is configured.
 */
export const DEMO_LOCATIONS: PatientLocation[] = [
  {
    address: 'Chitkara University, Rajpura',
    latitude: 30.5162,
    longitude: 76.6593,
    source: 'manual',
    subtext: 'NH-7 Chandigarh-Patiala National Highway, Rajpura, Punjab 140401',
    confidence: 0.98,
  },
  {
    address: 'Chitkara University Main Gate',
    latitude: 30.5180,
    longitude: 76.6580,
    source: 'manual',
    subtext: 'Campus Access Gate 1, Rajpura, Punjab',
    confidence: 0.95,
  },
  {
    address: 'Rajpura Civil Hospital Area',
    latitude: 30.4840,
    longitude: 76.5940,
    source: 'manual',
    subtext: 'Near Old Bus Stand, Rajpura, Punjab 140401',
    confidence: 0.92,
  },
  {
    address: 'Sector 17 Plaza, Chandigarh',
    latitude: 30.7410,
    longitude: 76.7850,
    source: 'manual',
    subtext: 'City Centre, Sector 17, Chandigarh, UT 160017',
    confidence: 0.96,
  },
  {
    address: 'Phase 7 / Sector 61, Mohali',
    latitude: 30.7100,
    longitude: 76.7110,
    source: 'manual',
    subtext: 'SAS Nagar, Mohali, Punjab 160062',
    confidence: 0.94,
  },
  {
    address: 'Zirakpur Highway Junction',
    latitude: 30.6420,
    longitude: 76.8170,
    source: 'manual',
    subtext: 'Ambala-Chandigarh Expressway, Zirakpur, Punjab 140603',
    confidence: 0.91,
  },
  {
    address: 'Civil Lines, Patiala',
    latitude: 30.3340,
    longitude: 76.3980,
    source: 'manual',
    subtext: 'Near Fountain Chowk, Patiala, Punjab 147001',
    confidence: 0.93,
  },
  {
    address: 'Dera Bassi Main Market',
    latitude: 30.5830,
    longitude: 76.8440,
    source: 'manual',
    subtext: 'Barwala Road, Dera Bassi, Punjab 140507',
    confidence: 0.89,
  },
];

/**
 * Calculates Euclidean distance approximation between two lat/lng coordinates in km.
 */
function approximateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111;
  const dLon = (lon2 - lon1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * Checks if browser Geolocation API is available
 */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator && !!navigator.geolocation;
}

/**
 * Reverse-geocodes given coordinates to a human-readable location name.
 * Uses local Tricity presets or generates a clean coordinate label.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  // Check against known demo locations
  let closestLoc: PatientLocation | null = null;
  let minDistance = Infinity;

  for (const loc of DEMO_LOCATIONS) {
    const dist = approximateDistanceKm(latitude, longitude, loc.latitude, loc.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestLoc = loc;
    }
  }

  // If within 2 km of a known regional hub, return clean reference
  if (closestLoc && minDistance < 2.5) {
    return closestLoc.address;
  }

  if (closestLoc && minDistance < 6) {
    return `Near ${closestLoc.address} (approx ${minDistance.toFixed(1)} km)`;
  }

  // Fallback: human-readable coordinate description
  return `Current Location (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`;
}

/**
 * Requests device/browser geolocation upon explicit user trigger.
 */
export async function getCurrentLocation(): Promise<PatientLocation> {
  if (!isGeolocationSupported()) {
    throw new Error('Current location is not supported by this browser.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = Number(position.coords.latitude.toFixed(4));
          const lng = Number(position.coords.longitude.toFixed(4));
          const address = await reverseGeocode(lat, lng);

          resolve({
            address,
            latitude: lat,
            longitude: lng,
            source: 'current',
            confidence: 0.96,
            subtext: `GPS Telemetry: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
          });
        } catch (err) {
          // If reverse geocoding fails, do not invent an address
          resolve({
            address: `Current location detected (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'current',
            confidence: 0.90,
            subtext: 'Coordinates available from device',
          });
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Unable to determine current location.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out. Please enter location manually.'));
            break;
          default:
            reject(new Error('Unable to acquire current location.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Searches locations using deterministic demo data with fuzzy query matching.
 */
export async function searchLocations(query: string): Promise<PatientLocation[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (cleanQuery.length === 0) {
    return [];
  }

  // Find matches in DEMO_LOCATIONS
  const matches = DEMO_LOCATIONS.filter((loc) => {
    return (
      loc.address.toLowerCase().includes(cleanQuery) ||
      (loc.subtext && loc.subtext.toLowerCase().includes(cleanQuery))
    );
  });

  if (matches.length > 0) {
    return matches;
  }

  // If no exact demo preset matches, provide an estimated regional entry for valid input (>= 3 chars)
  if (cleanQuery.length >= 3) {
    // Generate deterministic coordinate offset near Tricity corridor
    const hash = cleanQuery.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((hash % 30) - 15) * 0.006;
    const lngOffset = (((hash * 7) % 30) - 15) * 0.006;
    const estLat = Number((30.5162 + latOffset).toFixed(4));
    const estLng = Number((76.6593 + lngOffset).toFixed(4));

    return [
      {
        address: query.trim(),
        latitude: estLat,
        longitude: estLng,
        source: 'manual',
        subtext: 'Custom CAD location (Tricity Regional Corridor)',
        confidence: 0.75,
      },
    ];
  }

  return [];
}

/**
 * Returns default Chitkara University location for quick fallback
 */
export function getDefaultLocation(): PatientLocation {
  return DEMO_LOCATIONS[0];
}
