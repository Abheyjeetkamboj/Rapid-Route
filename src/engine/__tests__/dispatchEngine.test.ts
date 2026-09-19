import { describe, it, expect } from 'vitest';
import { findBestAmbulance } from '../dispatchEngine';
import type { Ambulance, EmergencyDispatchInput, DispatchSelectionRecord } from '../../types';

describe('RapidRoute Dispatch Decision Engine', () => {
  // Base fleet fixture
  const createAmbulance = (overrides: Partial<Ambulance>): Ambulance => ({
    id: 'RR-TEST',
    currentArea: 'Zirakpur',
    status: 'AVAILABLE',
    etaMinutes: 10,
    trafficCondition: 'Light',
    capability: 'ALS',
    driverName: 'Test Driver',
    assignedIncident: null,
    lastUpdated: '22:40 IST',
    lat: 30.642,
    lng: 76.817,
    ...overrides,
  });

  const baseEmergency: EmergencyDispatchInput = {
    id: 'INC-TEST-01',
    location: 'Chitkara University, Rajpura',
    emergencyType: 'Acute Trauma',
    severity: 'Urgent',
    patientCount: 1,
    requiredCapability: 'ALS',
  };

  // -------------------------------------------------------------
  // TEST 1: Three available ambulances -> Choose fastest suitable
  // -------------------------------------------------------------
  it('TEST 1: chooses the fastest suitable ambulance among available units', () => {
    const fleet: Ambulance[] = [
      createAmbulance({ id: 'RR-101', etaMinutes: 15, capability: 'ALS', status: 'AVAILABLE', trafficCondition: 'Light' }),
      createAmbulance({ id: 'RR-204', etaMinutes: 8, capability: 'ALS', status: 'AVAILABLE', trafficCondition: 'Light' }),
      createAmbulance({ id: 'RR-305', etaMinutes: 20, capability: 'ALS', status: 'AVAILABLE', trafficCondition: 'Light' }),
    ];

    const result = findBestAmbulance(baseEmergency, fleet);

    expect(result.hasSuitableAmbulance).toBe(true);
    expect(result.recommendedAmbulanceId).toBe('RR-204');
    expect(result.etaMinutes).toBe(8);
    expect(result.eligibleCandidates.length).toBe(3);
    expect(result.eligibleCandidates[0].ambulance.id).toBe('RR-204');
    expect(result.eligibleCandidates[1].ambulance.id).toBe('RR-101');
    expect(result.eligibleCandidates[2].ambulance.id).toBe('RR-305');
  });

  // -------------------------------------------------------------
  // TEST 2: Nearest ambulance is unsuitable -> Choose farther suitable
  // -------------------------------------------------------------
  it('TEST 2: excludes a nearer unsuitable ambulance and chooses a farther suitable ambulance', () => {
    const fleet: Ambulance[] = [
      // Nearest: 4 min, but only BLS (insufficient for urgent ALS trauma)
      createAmbulance({ id: 'RR-BLS-NEAR', etaMinutes: 4, capability: 'BLS', status: 'AVAILABLE' }),
      // Farther: 11 min, but certified ALS
      createAmbulance({ id: 'RR-ALS-FAR', etaMinutes: 11, capability: 'ALS', status: 'AVAILABLE' }),
    ];

    const result = findBestAmbulance(baseEmergency, fleet);

    expect(result.hasSuitableAmbulance).toBe(true);
    expect(result.recommendedAmbulanceId).toBe('RR-ALS-FAR');
    expect(result.etaMinutes).toBe(11);

    // Verify RR-BLS-NEAR was excluded
    const excludedIds = result.excludedCandidates.map((c) => c.ambulance.id);
    expect(excludedIds).toContain('RR-BLS-NEAR');
    const blsExclusion = result.excludedCandidates.find((c) => c.ambulance.id === 'RR-BLS-NEAR');
    expect(blsExclusion?.exclusionReason).toMatch(/BLS unit lacks paramedic credentials/);
  });

  // -------------------------------------------------------------
  // TEST 3: Fastest ambulance is busy -> Exclude it
  // -------------------------------------------------------------
  it('TEST 3: excludes the fastest ambulance if its operational status is busy', () => {
    const fleet: Ambulance[] = [
      // 3 min away, but busy on another incident
      createAmbulance({ id: 'RR-BUSY', etaMinutes: 3, capability: 'ALS', status: 'BUSY', assignedIncident: 'INC-OLD' }),
      // 9 min away, available
      createAmbulance({ id: 'RR-AVAIL', etaMinutes: 9, capability: 'ALS', status: 'AVAILABLE' }),
    ];

    const result = findBestAmbulance(baseEmergency, fleet);

    expect(result.hasSuitableAmbulance).toBe(true);
    expect(result.recommendedAmbulanceId).toBe('RR-AVAIL');
    expect(result.etaMinutes).toBe(9);

    const busyExclusion = result.excludedCandidates.find((c) => c.ambulance.id === 'RR-BUSY');
    expect(busyExclusion?.exclusionReason).toMatch(/Ambulance currently busy/);
  });

  // -------------------------------------------------------------
  // TEST 4: Critical cardiac case -> Prefer ambulance with cardiac capability
  // -------------------------------------------------------------
  it('TEST 4: prefers ambulance with specialized cardiac capability for cardiac emergency', () => {
    const cardiacEmergency: EmergencyDispatchInput = {
      id: 'INC-CARDIAC-99',
      location: 'Chitkara University',
      emergencyType: 'Suspected Cardiac Arrest',
      severity: 'Critical',
      patientCount: 1,
      requiredCapability: 'ALS + Cardiac',
    };

    const fleet: Ambulance[] = [
      // Fast 6 min, but standard ALS without cardiac monitor
      createAmbulance({ id: 'RR-ALS-ONLY', etaMinutes: 6, capability: 'ALS', status: 'AVAILABLE' }),
      // 8 min, with ALS + Cardiac
      createAmbulance({ id: 'RR-CARDIAC', etaMinutes: 8, capability: 'ALS + Cardiac', status: 'AVAILABLE' }),
      // 10 min, BLS
      createAmbulance({ id: 'RR-BLS', etaMinutes: 10, capability: 'BLS', status: 'AVAILABLE' }),
    ];

    const result = findBestAmbulance(cardiacEmergency, fleet);

    expect(result.hasSuitableAmbulance).toBe(true);
    expect(result.recommendedAmbulanceId).toBe('RR-CARDIAC');
    expect(result.etaMinutes).toBe(8);

    // Both RR-ALS-ONLY and RR-BLS should be excluded due to lacking cardiac capability
    const excludedIds = result.excludedCandidates.map((c) => c.ambulance.id);
    expect(excludedIds).toContain('RR-ALS-ONLY');
    expect(excludedIds).toContain('RR-BLS');
  });

  // -------------------------------------------------------------
  // TEST 5: No suitable ambulance -> Return no recommendation with reason
  // -------------------------------------------------------------
  it('TEST 5: returns no recommendation and clear reason when no ambulance is suitable', () => {
    const icuEmergency: EmergencyDispatchInput = {
      id: 'INC-ICU-01',
      location: 'Patiala Hospital',
      emergencyType: 'ICU Inter-facility transfer',
      severity: 'Critical',
      patientCount: 1,
      requiredCapability: 'ICU',
    };

    const fleet: Ambulance[] = [
      createAmbulance({ id: 'RR-BLS', capability: 'BLS', status: 'AVAILABLE', etaMinutes: 5 }),
      createAmbulance({ id: 'RR-ALS', capability: 'ALS', status: 'AVAILABLE', etaMinutes: 7 }),
      createAmbulance({ id: 'RR-ICU-BUSY', capability: 'ICU', status: 'BUSY', etaMinutes: 8 }),
    ];

    const result = findBestAmbulance(icuEmergency, fleet);

    expect(result.hasSuitableAmbulance).toBe(false);
    expect(result.recommendedAmbulanceId).toBeNull();
    expect(result.finalScore).toBeNull();
    expect(result.eligibleCandidates.length).toBe(0);
    expect(result.statusMessage).toMatch(/No available ambulance currently meets the required medical capability/);
  });

  // -------------------------------------------------------------
  // TEST 6: Same ETA -> Use capability & traffic tie-breaker
  // -------------------------------------------------------------
  it('TEST 6: uses capability and traffic tie-breakers when two ambulances have identical ETA', () => {
    const fleet: Ambulance[] = [
      // Unit A: 10 min, exact ALS, Heavy traffic (traffic score 40)
      createAmbulance({
        id: 'RR-AAA',
        etaMinutes: 10,
        capability: 'ALS',
        status: 'AVAILABLE',
        trafficCondition: 'Heavy',
      }),
      // Unit B: 10 min, exact ALS, Light traffic (traffic score 100)
      createAmbulance({
        id: 'RR-BBB',
        etaMinutes: 10,
        capability: 'ALS',
        status: 'AVAILABLE',
        trafficCondition: 'Light',
      }),
    ];

    const result = findBestAmbulance(baseEmergency, fleet);

    expect(result.hasSuitableAmbulance).toBe(true);
    // Unit B has lighter traffic route, so higher composite score
    expect(result.recommendedAmbulanceId).toBe('RR-BBB');
    expect(result.eligibleCandidates[0].scoreBreakdown!.finalScore).toBeGreaterThan(
      result.eligibleCandidates[1].scoreBreakdown!.finalScore
    );
  });

  // -------------------------------------------------------------
  // TEST 7: Dispatcher manual choice override record
  // -------------------------------------------------------------
  it('TEST 7: records both AI recommendation and manual dispatcher override for audit analytics', () => {
    const fleet: Ambulance[] = [
      createAmbulance({ id: 'RR-BEST', etaMinutes: 7, capability: 'ALS', status: 'AVAILABLE' }),
      createAmbulance({ id: 'RR-ALT', etaMinutes: 12, capability: 'ALS', status: 'AVAILABLE' }),
    ];

    const recommendation = findBestAmbulance(baseEmergency, fleet);
    expect(recommendation.recommendedAmbulanceId).toBe('RR-BEST');

    // Dispatcher chooses the alternative RR-ALT
    const selectionRecord: DispatchSelectionRecord = {
      emergencyId: baseEmergency.id,
      recommendedAmbulanceId: recommendation.recommendedAmbulanceId!,
      selectedAmbulanceId: 'RR-ALT',
      isOverride: recommendation.recommendedAmbulanceId !== 'RR-ALT',
      overrideReason: 'Dispatcher familiarity with road detour near Rajpura bypass',
      timestamp: '22:45 IST',
      authorizedBy: 'Officer S. Sharma',
    };

    expect(selectionRecord.isOverride).toBe(true);
    expect(selectionRecord.recommendedAmbulanceId).toBe('RR-BEST');
    expect(selectionRecord.selectedAmbulanceId).toBe('RR-ALT');
    expect(selectionRecord.overrideReason).toBeDefined();
  });

  // -------------------------------------------------------------
  // EDGE CASE TESTS: Missing Telemetry & Incomplete Data
  // -------------------------------------------------------------
  it('EDGE CASE: excludes ambulances with missing ETA telemetry', () => {
    const fleet: Ambulance[] = [
      createAmbulance({ id: 'RR-NO-ETA', etaMinutes: null, capability: 'ALS', status: 'AVAILABLE' }),
    ];

    const result = findBestAmbulance(baseEmergency, fleet);
    expect(result.hasSuitableAmbulance).toBe(false);
    expect(result.statusMessage).toMatch(/ETA telemetry unavailable/);
  });

  it('EDGE CASE: flags incomplete emergency data (missing location)', () => {
    const incompleteEmergency: EmergencyDispatchInput = {
      id: 'INC-ERR',
      location: '',
      emergencyType: 'Cardiac',
      severity: 'Critical',
      patientCount: 1,
      requiredCapability: 'ALS',
    };

    const fleet: Ambulance[] = [createAmbulance({ id: 'RR-01' })];
    const result = findBestAmbulance(incompleteEmergency, fleet);

    expect(result.hasSuitableAmbulance).toBe(false);
    expect(result.statusMessage).toMatch(/location is required/i);
  });
});

