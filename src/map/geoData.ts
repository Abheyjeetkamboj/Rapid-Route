import type { LatLngTuple } from './mapTypes';
import type { ActiveEmergency } from '../types';

export const TRICITY_CENTER: LatLngTuple = [30.5800, 76.7200];
export const DEFAULT_MAP_ZOOM = 11;

/**
 * Standard coordinates for known incident locations in the Tricity / Punjab corridor
 */
export const INCIDENT_COORDINATES: Record<string, LatLngTuple> = {
  'INC-4821': [30.5162, 76.6593], // Chitkara University, Rajpura
  'INC-4820': [30.7410, 76.7850], // Sector 17, Chandigarh
  'INC-4819': [30.7100, 76.7110], // Phase 7, Mohali
  'INC-4817': [30.3340, 76.3980], // Civil Lines, Patiala
};

/**
 * Known base locations for geocoding user input strings
 */
export const LOCATION_PRESETS: Record<string, LatLngTuple> = {
  'chitkara university, rajpura': [30.5162, 76.6593],
  'chitkara university': [30.5162, 76.6593],
  'sector 17, chandigarh': [30.7410, 76.7850],
  'chandigarh': [30.7333, 76.7794],
  'phase 7, mohali': [30.7100, 76.7110],
  'mohali': [30.7046, 76.7179],
  'civil lines, patiala': [30.3340, 76.3980],
  'patiala': [30.3398, 76.3869],
  'rajpura': [30.4840, 76.5940],
  'zirakpur': [30.6420, 76.8170],
  'panchkula': [30.6940, 76.8600],
  'dera bassi': [30.5830, 76.8440],
};

/**
 * Standard coordinates for hospitals
 */
export const HOSPITAL_COORDINATES: Record<string, LatLngTuple> = {
  'HOSP-01': [30.4860, 76.5980], // City Emergency Hospital, Rajpura
  'HOSP-02': [30.6450, 76.8220], // Apollo Multispeciality, Zirakpur
  'HOSP-03': [30.7660, 76.7760], // PGIMER Trauma Hub, Chandigarh
  'HOSP-04': [30.3310, 76.3920], // Civil Hospital, Patiala
  'HOSP-05': [30.6930, 76.7320], // Fortis Hospital, Mohali
};

/**
 * Resolves coordinates for an incident entity or location string
 */
export function getCoordinatesForIncident(incident: ActiveEmergency | { id: string; location: string }): LatLngTuple {
  if (INCIDENT_COORDINATES[incident.id]) {
    return INCIDENT_COORDINATES[incident.id];
  }

  const normalized = incident.location.trim().toLowerCase();
  for (const [key, coords] of Object.entries(LOCATION_PRESETS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }

  // Fallback: subtle hash offset around Rajpura/Chitkara corridor
  const hash = incident.location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const latOffset = ((hash % 40) - 20) * 0.005;
  const lngOffset = (((hash * 7) % 40) - 20) * 0.005;
  return [30.5162 + latOffset, 76.6593 + lngOffset];
}

/**
 * Returns hospital coordinates by ID or falls back to Rajpura hospital
 */
export function getCoordinatesForHospital(hospitalId: string): LatLngTuple {
  return HOSPITAL_COORDINATES[hospitalId] || [30.4860, 76.5980];
}

