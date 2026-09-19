import { describe, it, expect } from 'vitest';
import { recommendHospital, HOSPITAL_SCORING_WEIGHTS } from '../hospitalSelectionEngine';
import {
  generateHospitalPreAlert,
  simulateHospitalAcknowledgement,
  recordHospitalArrival,
  completeHospitalHandover,
  deriveClinicalPreparation,
} from '../../services/preAlertService';
import type { Hospital, ActiveEmergency } from '../../types';

describe('RapidRoute Hospital Selection Engine & Pre-Alert Service', () => {
  const createHospital = (overrides: Partial<Hospital>): Hospital => ({
    id: 'HOSP-TEST',
    name: 'Test Medical Center',
    location: { lat: 30.486, lng: 76.598 },
    area: 'Rajpura',
    distanceKm: 5,
    emergencyStatus: 'ready',
    edStatus: 'Ready',
    capabilities: ['Emergency Surgery', 'Trauma', 'ICU', 'Cardiac'],
    emergencyCapability: 'Level 1 Trauma & Cardiac',
    icuBedsAvailable: 4,
    icuBedsTotal: 10,
    emergencyBedsAvailable: 8,
    emergencyBedsTotal: 15,
    cardiacUnit: true,
    traumaLevel: 'Level I',
    currentIncomingPatients: 0,
    incomingPatients: 0,
    contactStatus: 'online',
    ...overrides,
  });

  const baseEmergency: ActiveEmergency = {
    id: 'INC-4821',
    severity: 'Critical',
    location: 'Chitkara University, Rajpura',
    emergencyType: 'Acute Myocardial Infarction',
    patientCount: 1,
    requiredCapability: 'ALS + Cardiac',
    notes: '54M presenting with crushing substernal chest pain radiating to left arm. Diaphoretic.',
    status: 'Dispatched',
    dispatchStage: 'Dispatched',
    assignedAmbulance: 'RR-204',
    etaMinutes: 8,
    reportedAt: '22:41 IST',
    symptoms: ['Crushing chest pain', 'Diaphoresis', 'Shortness of breath'],
    patientAge: 54,
    timeline: [],
  };

  // -------------------------------------------------------------
  // TEST 1: Cardiac specialty requirement matching
  // -------------------------------------------------------------
  it('TEST 1: prioritizes hospitals with 24/7 cardiac cath lab units for acute cardiac cases', () => {
    const network: Hospital[] = [
      createHospital({
        id: 'HOSP-GEN',
        name: 'General Community Clinic',
        cardiacUnit: false,
        capabilities: ['General Emergency', 'ICU'],
        distanceKm: 4,
      }),
      createHospital({
        id: 'HOSP-CARD',
        name: 'City Heart & Emergency Institute',
        cardiacUnit: true,
        capabilities: ['Cardiac', 'Trauma', 'ICU', 'Emergency Surgery'],
        distanceKm: 6,
      }),
    ];

    const result = recommendHospital(baseEmergency, network);

    expect(result.hasSuitableHospital).toBe(true);
    expect(result.recommendedHospitalId).toBe('HOSP-CARD');
    expect(result.recommendedHospital?.cardiacUnit).toBe(true);
    // General clinic should be excluded due to lack of cardiac unit
    expect(result.excludedHospitals.some((ex) => ex.hospital.id === 'HOSP-GEN')).toBe(true);
  });

  // -------------------------------------------------------------
  // TEST 2: Diverting hospital exclusion
  // -------------------------------------------------------------
  it('TEST 2: excludes diverting hospitals even if they are geographically closer', () => {
    const network: Hospital[] = [
      createHospital({
        id: 'HOSP-CLOSE-DIVERT',
        name: 'Closest Diverting Hospital',
        distanceKm: 2,
        emergencyStatus: 'diverting',
        edStatus: 'Diverting',
      }),
      createHospital({
        id: 'HOSP-FAR-READY',
        name: 'Regional Trauma Hospital',
        distanceKm: 12,
        emergencyStatus: 'ready',
        edStatus: 'Ready',
      }),
    ];

    const result = recommendHospital(baseEmergency, network);

    expect(result.hasSuitableHospital).toBe(true);
    expect(result.recommendedHospitalId).toBe('HOSP-FAR-READY');
    expect(result.excludedHospitals.some((ex) => ex.hospital.id === 'HOSP-CLOSE-DIVERT')).toBe(true);
    expect(result.excludedHospitals[0].reason).toContain('diverting');
  });

  // -------------------------------------------------------------
  // TEST 3: Full hospital exclusion (100% capacity)
  // -------------------------------------------------------------
  it('TEST 3: excludes hospitals at 100% capacity or zero beds available', () => {
    const network: Hospital[] = [
      createHospital({
        id: 'HOSP-FULL',
        name: 'Overloaded General Hospital',
        emergencyStatus: 'full',
        icuBedsAvailable: 0,
        emergencyBedsAvailable: 0,
      }),
      createHospital({
        id: 'HOSP-OPEN',
        name: 'Available Suburban Center',
        emergencyStatus: 'ready',
        icuBedsAvailable: 3,
        emergencyBedsAvailable: 6,
      }),
    ];

    const result = recommendHospital(baseEmergency, network);

    expect(result.hasSuitableHospital).toBe(true);
    expect(result.recommendedHospitalId).toBe('HOSP-OPEN');
    expect(result.excludedHospitals.some((ex) => ex.hospital.id === 'HOSP-FULL')).toBe(true);
  });

  // -------------------------------------------------------------
  // TEST 4: Critical incident capability exclusion
  // -------------------------------------------------------------
  it('TEST 4: excludes facilities lacking ICU or surgical capability for Critical acuity incidents', () => {
    const criticalTraumaEmergency: ActiveEmergency = {
      ...baseEmergency,
      emergencyType: 'High-Speed Collision Multi-Trauma',
      requiredCapability: 'ALS',
      severity: 'Critical',
      symptoms: ['Multiple compound fractures', 'Hypotension'],
    };

    const network: Hospital[] = [
      createHospital({
        id: 'HOSP-OUTPATIENT',
        name: 'Outpatient Triage Center',
        capabilities: ['General Emergency'], // Missing ICU and Emergency Surgery
        emergencyStatus: 'ready',
      }),
      createHospital({
        id: 'HOSP-TRAUMA-SURG',
        name: 'Apex Trauma & Surgery Hospital',
        capabilities: ['Trauma', 'Emergency Surgery', 'ICU'],
        emergencyStatus: 'ready',
      }),
    ];

    const result = recommendHospital(criticalTraumaEmergency, network);

    expect(result.hasSuitableHospital).toBe(true);
    expect(result.recommendedHospitalId).toBe('HOSP-TRAUMA-SURG');
    expect(result.excludedHospitals.some((ex) => ex.hospital.id === 'HOSP-OUTPATIENT')).toBe(true);
  });

  // -------------------------------------------------------------
  // TEST 5: Closest-unsuitable hospital non-selection
  // -------------------------------------------------------------
  it('TEST 5: fulfills core value — does NOT simply route to the closest hospital when unsuitable', () => {
    const network: Hospital[] = [
      // 1.5 km away, but diverting
      createHospital({
        id: 'HOSP-NEAREST-DIVERT',
        name: 'Nearby Community Ward',
        distanceKm: 1.5,
        emergencyStatus: 'diverting',
      }),
      // 3.0 km away, but no cardiac capability
      createHospital({
        id: 'HOSP-NEAR-NOCARDIAC',
        name: 'Local Orthopedic Center',
        distanceKm: 3.0,
        cardiacUnit: false,
        capabilities: ['Trauma', 'Orthopedics'],
      }),
      // 5.0 km away, fully equipped and ready
      createHospital({
        id: 'HOSP-FARTHER-SUITABLE',
        name: 'City Comprehensive Cardiac & Trauma Hub',
        distanceKm: 5.0,
        emergencyStatus: 'ready',
        cardiacUnit: true,
        capabilities: ['Cardiac', 'Trauma', 'ICU', 'Emergency Surgery'],
      }),
    ];

    const result = recommendHospital(baseEmergency, network);

    expect(result.hasSuitableHospital).toBe(true);
    expect(result.recommendedHospitalId).toBe('HOSP-FARTHER-SUITABLE');
    expect(result.eligibleHospitals.length).toBe(1);
    expect(result.excludedHospitals.length).toBe(2);
  });

  // -------------------------------------------------------------
  // TEST 6: Multi-factor score weighting formula
  // -------------------------------------------------------------
  it('TEST 6: correctly applies multi-factor weights (Capability 35%, Capacity 25%, ETA 25%, Load 15%)', () => {
    expect(HOSPITAL_SCORING_WEIGHTS.CAPABILITY).toBe(0.35);
    expect(HOSPITAL_SCORING_WEIGHTS.CAPACITY).toBe(0.25);
    expect(HOSPITAL_SCORING_WEIGHTS.ETA).toBe(0.25);
    expect(HOSPITAL_SCORING_WEIGHTS.LOAD).toBe(0.15);

    const network: Hospital[] = [
      createHospital({
        id: 'HOSP-ALPHA',
        name: 'Hospital Alpha',
        icuBedsAvailable: 8,
        icuBedsTotal: 10,
        emergencyBedsAvailable: 12,
        emergencyBedsTotal: 15,
        currentIncomingPatients: 0,
        distanceKm: 5,
      }),
    ];

    const result = recommendHospital(baseEmergency, network);

    expect(result.hasSuitableHospital).toBe(true);
    const candidate = result.eligibleHospitals[0];
    expect(candidate.score).toBeGreaterThan(80);
    expect(candidate.scoreBreakdown).toHaveProperty('capabilityScore');
    expect(candidate.scoreBreakdown).toHaveProperty('capacityScore');
    expect(candidate.scoreBreakdown).toHaveProperty('etaScore');
    expect(candidate.scoreBreakdown).toHaveProperty('loadScore');
  });

  // -------------------------------------------------------------
  // TEST 7: Pre-alert structured facts grounding
  // -------------------------------------------------------------
  it('TEST 7: generates pre-alerts grounded strictly in verified incident facts without hallucination', () => {
    const hospital = createHospital({ id: 'HOSP-01', name: 'City Emergency Hospital' });
    const ambulance = { id: 'RR-204', etaMinutes: 7 };

    const preAlert = generateHospitalPreAlert(baseEmergency, ambulance, hospital);

    expect(preAlert.incidentId).toBe('INC-4821');
    expect(preAlert.hospitalId).toBe('HOSP-01');
    expect(preAlert.ambulanceId).toBe('RR-204');
    expect(preAlert.ambulanceEta).toBe(7);
    expect(preAlert.severity).toBe('Critical');
    expect(preAlert.patientAge).toBe(54);
    expect(preAlert.symptoms).toEqual(['Crushing chest pain', 'Diaphoresis', 'Shortness of breath']);
    expect(preAlert.requiredPreparation).toContain('Cardiac Catheterization Team');
    expect(preAlert.status).toBe('READY_TO_SEND');
  });

  // -------------------------------------------------------------
  // TEST 8: Explainability reasons formulation
  // -------------------------------------------------------------
  it('TEST 8: generates deterministic explainability reasons for dispatcher review', () => {
    const network: Hospital[] = [
      createHospital({
        id: 'HOSP-01',
        name: 'City Emergency Hospital',
        cardiacUnit: true,
        emergencyStatus: 'ready',
        emergencyBedsAvailable: 6,
        icuBedsAvailable: 3,
        currentIncomingPatients: 1,
      }),
    ];

    const result = recommendHospital(baseEmergency, network);

    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    expect(result.reasons.some((r) => r.includes('cardiac care team'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('Emergency Department ready'))).toBe(true);
  });

  // -------------------------------------------------------------
  // TEST 9: Hospital acknowledgement simulation
  // -------------------------------------------------------------
  it('TEST 9: simulates hospital acknowledgement and updates status to ACKNOWLEDGED', () => {
    const hospital = createHospital({ id: 'HOSP-01' });
    const ambulance = { id: 'RR-204', etaMinutes: 8 };
    const draft = generateHospitalPreAlert(baseEmergency, ambulance, hospital);

    const acknowledged = simulateHospitalAcknowledgement(draft, 'Trauma Resus 1 prepped by ED Charge Nurse');

    expect(acknowledged.status).toBe('ACKNOWLEDGED');
    expect(acknowledged.acknowledgedAt).toBeDefined();
    expect(acknowledged.acknowledgementNotes).toBe('Trauma Resus 1 prepped by ED Charge Nurse');
  });

  // -------------------------------------------------------------
  // TEST 10: Arrival and Handover complete lifecycle
  // -------------------------------------------------------------
  it('TEST 10: transitions lifecycle from arrival to final clinical handover', () => {
    const hospital = createHospital({ id: 'HOSP-01' });
    const ambulance = { id: 'RR-204', etaMinutes: 8 };
    const draft = generateHospitalPreAlert(baseEmergency, ambulance, hospital);
    const ack = simulateHospitalAcknowledgement(draft);

    const arrived = recordHospitalArrival(ack);
    expect(arrived.status).toBe('PATIENT_ARRIVED');
    expect(arrived.arrivedAt).toBeDefined();

    const handover = completeHospitalHandover(arrived, 'Patient transferred to triage team.');
    expect(handover.status).toBe('HANDOVER_COMPLETED');
    expect(handover.handoverCompletedAt).toBeDefined();
    expect(handover.acknowledgementNotes).toBe('Patient transferred to triage team.');
  });

  // -------------------------------------------------------------
  // TEST 11: No suitable hospital failure state
  // -------------------------------------------------------------
  it('TEST 11: gracefully handles failure state when all network facilities are offline or diverting', () => {
    const network: Hospital[] = [
      createHospital({ id: 'H-1', emergencyStatus: 'diverting' }),
      createHospital({ id: 'H-2', contactStatus: 'offline' }),
      createHospital({ id: 'H-3', emergencyStatus: 'full' }),
    ];

    const result = recommendHospital(baseEmergency, network);

    expect(result.hasSuitableHospital).toBe(false);
    expect(result.recommendedHospital).toBeNull();
    expect(result.recommendedHospitalId).toBeNull();
    expect(result.eligibleHospitals.length).toBe(0);
    expect(result.excludedHospitals.length).toBe(3);
    expect(result.statusMessage).toContain('NO SUITABLE RECEIVING HOSPITAL FOUND');
  });

  // -------------------------------------------------------------
  // Clinical preparation derivation helper test
  // -------------------------------------------------------------
  it('TEST 12: derives clinical preparation based on incident type', () => {
    const cardiacPrep = deriveClinicalPreparation(baseEmergency);
    expect(cardiacPrep).toContain('Cardiac Catheterization');

    const traumaEmergency: ActiveEmergency = {
      ...baseEmergency,
      emergencyType: 'Motor Vehicle Collision',
      symptoms: ['Trauma', 'Loss of consciousness'],
    };
    const traumaPrep = deriveClinicalPreparation(traumaEmergency);
    expect(traumaPrep).toContain('Trauma Surgical Team');
  });
});

