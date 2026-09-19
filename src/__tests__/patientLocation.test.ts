import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCurrentLocation,
  searchLocations,
  reverseGeocode,
  isGeolocationSupported,
  DEMO_LOCATIONS,
} from '../services/locationService';
import { getCoordinatesForIncident } from '../map/geoData';
import type { ActiveEmergency, PatientLocation } from '../types';

describe('Patient Location Selector & Location Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. MANUAL SEARCH & DEMO DATA
  // =========================================================================
  describe('1. Manual Location Search', () => {
    it('returns exact demo locations when searching for "Chitkara"', async () => {
      const results = await searchLocations('Chitkara');
      expect(results.length).toBeGreaterThanOrEqual(1);

      const topResult = results[0];
      expect(topResult.address).toContain('Chitkara University');
      expect(topResult.latitude).toBeCloseTo(30.5162, 3);
      expect(topResult.longitude).toBeCloseTo(76.6593, 3);
      expect(topResult.source).toBe('manual');
    });

    it('returns exact demo locations for "Sector 17"', async () => {
      const results = await searchLocations('Sector 17');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].address).toContain('Sector 17');
      expect(results[0].latitude).toBeCloseTo(30.7410, 3);
      expect(results[0].longitude).toBeCloseTo(76.7850, 3);
    });

    it('returns empty array when search query is empty or whitespace', async () => {
      const results = await searchLocations('   ');
      expect(results).toEqual([]);
    });

    it('provides regional coordinate fallback for non-preset queries', async () => {
      const results = await searchLocations('Custom Sector Chowk');
      expect(results.length).toBe(1);
      expect(results[0].address).toBe('Custom Sector Chowk');
      expect(typeof results[0].latitude).toBe('number');
      expect(typeof results[0].longitude).toBe('number');
      expect(results[0].source).toBe('manual');
    });
  });

  // =========================================================================
  // 2. REVERSE GEOCODING
  // =========================================================================
  describe('2. Reverse Geocoding', () => {
    it('reverse geocodes coordinates close to Chitkara University', async () => {
      const name = await reverseGeocode(30.5162, 76.6593);
      expect(name).toBe('Chitkara University, Rajpura');
    });

    it('reverse geocodes coordinates close to Sector 17 Chandigarh', async () => {
      const name = await reverseGeocode(30.7410, 76.7850);
      expect(name).toBe('Sector 17 Plaza, Chandigarh');
    });

    it('generates formatted coordinate description for generic coordinates', async () => {
      const name = await reverseGeocode(31.2500, 77.1000);
      expect(name).toContain('31.2500° N, 77.1000° E');
    });
  });

  // =========================================================================
  // 3. DEVICE GEOLOCATION DETECTION & ERROR HANDLING
  // =========================================================================
  describe('3. Geolocation API Detection & Error Resilience', () => {
    it('successfully detects device location when permission is granted', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 30.5162,
              longitude: 76.6593,
              accuracy: 10,
            },
          });
        }),
      };

      vi.stubGlobal('navigator', { geolocation: mockGeolocation });

      const location = await getCurrentLocation();
      expect(location.source).toBe('current');
      expect(location.latitude).toBeCloseTo(30.5162, 3);
      expect(location.longitude).toBeCloseTo(76.6593, 3);
      expect(location.address).toBe('Chitkara University, Rajpura');
    });

    it('throws helpful error when location permission is denied', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((_success, error) => {
          error({
            code: 1, // PERMISSION_DENIED
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'User denied Geolocation',
          });
        }),
      };

      vi.stubGlobal('navigator', { geolocation: mockGeolocation });

      await expect(getCurrentLocation()).rejects.toThrow('Location permission denied.');
    });

    it('throws helpful error when position is unavailable', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((_success, error) => {
          error({
            code: 2, // POSITION_UNAVAILABLE
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'Position unavailable',
          });
        }),
      };

      vi.stubGlobal('navigator', { geolocation: mockGeolocation });

      await expect(getCurrentLocation()).rejects.toThrow('Unable to determine current location.');
    });

    it('validates isGeolocationSupported helper correctly', () => {
      vi.stubGlobal('navigator', {});
      expect(isGeolocationSupported()).toBe(false);

      vi.stubGlobal('navigator', { geolocation: {} });
      expect(isGeolocationSupported()).toBe(true);
    });

    it('verifies DEMO_LOCATIONS has realistic regional landmarks', () => {
      expect(DEMO_LOCATIONS.length).toBeGreaterThanOrEqual(5);
      const chitkara = DEMO_LOCATIONS.find((l) => l.address.includes('Chitkara'));
      expect(chitkara).toBeDefined();
      expect(chitkara?.latitude).toBeCloseTo(30.5162, 3);
    });

    it('throws helpful error when browser does not support geolocation', async () => {
      vi.stubGlobal('navigator', {});

      await expect(getCurrentLocation()).rejects.toThrow(
        'Current location is not supported by this browser.'
      );
    });
  });

  // =========================================================================
  // 4. MAP & COORDINATE INTEGRATION
  // =========================================================================
  describe('4. Map and Incident Coordinate Integration', () => {
    it('prioritizes incident.patientLocation coordinates for map placement', () => {
      const customLocation: PatientLocation = {
        address: 'Custom Hospital Point',
        latitude: 30.6500,
        longitude: 76.8200,
        source: 'manual',
      };

      const testEmergency = {
        id: 'INC-CUSTOM-01',
        location: 'Custom Hospital Point',
        patientLocation: customLocation,
      };

      const coords = getCoordinatesForIncident(testEmergency as ActiveEmergency);
      expect(coords[0]).toBe(30.6500);
      expect(coords[1]).toBe(76.8200);
    });

    it('falls back to known incident coordinates if patientLocation is not present', () => {
      const testEmergency = {
        id: 'INC-8841',
        location: 'Chitkara University, Rajpura',
      };

      const coords = getCoordinatesForIncident(testEmergency as ActiveEmergency);
      expect(coords[0]).toBe(30.5162);
      expect(coords[1]).toBe(76.6593);
    });
  });
});
