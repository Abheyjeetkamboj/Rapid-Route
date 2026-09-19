import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateEmergencyInput,
  validateCoordinates,
  ValidationError,
} from '../validationService';
import {
  validateEmergencyTransition,
  validateAmbulanceTransition,
  validateAlertTransition,
  InvalidStateTransitionError,
} from '../statusLifecycle';
import { emergencyService } from '../emergencyService';
import { ambulanceService } from '../ambulanceService';
import { hospitalService } from '../hospitalService';
import { dispatchService } from '../dispatchService';
import { alertService } from '../alertService';
import { activityService } from '../activityService';
import { createLocalRepositories, getRepositories } from '../../repositories';
import type { ActiveEmergency } from '../../types';

// In-memory mock for localStorage in test environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.getItem) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MockLocalStorage(),
    writable: true,
  });
}

describe('RapidRoute AI — Step 7: Persistent Data Layer & Services', () => {
  beforeEach(async () => {
    localStorage.clear();
    const local = createLocalRepositories();
    await local.resetAll();
  });

  /* =============================================================================
     1. INPUT & COORDINATE VALIDATION
     ============================================================================= */
  describe('Validation Service', () => {
    it('rejects emergencies with empty location', () => {
      expect(() => {
        validateEmergencyInput({ location: '' });
      }).toThrow(ValidationError);
      expect(() => {
        validateEmergencyInput({ location: '   ' });
      }).toThrow(/Location is required/);
    });

    it('rejects invalid patient count (< 1 or non-integer)', () => {
      expect(() => {
        validateEmergencyInput({ location: 'Sector 17', patientCount: 0 });
      }).toThrow(/Patient count must be an integer greater than or equal to 1/);
      expect(() => {
        validateEmergencyInput({ location: 'Sector 17', patientCount: -2 });
      }).toThrow(ValidationError);
    });

    it('rejects out-of-range coordinates', () => {
      expect(() => validateCoordinates(95.0, 76.0)).toThrow(/Latitude must be a valid number between -90 and 90/);
      expect(() => validateCoordinates(30.0, 195.0)).toThrow(/Longitude must be a valid number between -180 and 180/);
      expect(() => validateCoordinates(30.7333, 76.7794)).not.toThrow();
    });

    it('validates patient age boundaries', () => {
      expect(() => validateEmergencyInput({ location: 'Sector 17', patientAge: -5 })).toThrow(/Patient age/);
      expect(() => validateEmergencyInput({ location: 'Sector 17', patientAge: 150 })).toThrow(/Patient age/);
      expect(() => validateEmergencyInput({ location: 'Sector 17', patientAge: 45 })).not.toThrow();
    });
  });

  /* =============================================================================
     2. LIFECYCLE STATE MACHINE GUARDS
     ============================================================================= */
  describe('Status Lifecycle State Machines', () => {
    it('allows valid emergency lifecycle transitions', () => {
      expect(() => validateEmergencyTransition('Awaiting Dispatch', 'Recommended')).not.toThrow();
      expect(() => validateEmergencyTransition('Recommended', 'Dispatched')).not.toThrow();
      expect(() => validateEmergencyTransition('Dispatched', 'En Route')).not.toThrow();
      expect(() => validateEmergencyTransition('En Route', 'Transporting')).not.toThrow();
      expect(() => validateEmergencyTransition('Transporting', 'Completed')).not.toThrow();
    });

    it('rejects invalid emergency transitions (e.g. Completed -> Dispatched)', () => {
      expect(() => validateEmergencyTransition('Completed', 'Dispatched')).toThrow(InvalidStateTransitionError);
      expect(() => validateEmergencyTransition('Completed', 'Awaiting Dispatch')).toThrow(
        /Cannot transition from 'Completed' to 'Awaiting Dispatch'/
      );
    });

    it('allows valid ambulance status transitions', () => {
      expect(() => validateAmbulanceTransition('AVAILABLE', 'EN_ROUTE')).not.toThrow();
      expect(() => validateAmbulanceTransition('EN_ROUTE', 'BUSY')).not.toThrow();
      expect(() => validateAmbulanceTransition('BUSY', 'AVAILABLE')).not.toThrow();
      expect(() => validateAmbulanceTransition('AVAILABLE', 'AVAILABLE')).not.toThrow();
    });

    it('rejects invalid ambulance transitions', () => {
      expect(() => validateAmbulanceTransition('OFFLINE', 'EN_ROUTE')).toThrow(InvalidStateTransitionError);
    });

    it('enforces pre-alert status transitions strictly', () => {
      expect(() => validateAlertTransition('DRAFT', 'SENT')).not.toThrow();
      expect(() => validateAlertTransition('SENT', 'ACKNOWLEDGED')).not.toThrow();
      expect(() => validateAlertTransition('ACKNOWLEDGED', 'PATIENT_ARRIVED')).not.toThrow();
      expect(() => validateAlertTransition('PATIENT_ARRIVED', 'HANDOVER_COMPLETED')).not.toThrow();
      expect(() => validateAlertTransition('DRAFT', 'HANDOVER_COMPLETED')).toThrow(InvalidStateTransitionError);
    });
  });

  /* =============================================================================
     3. EMERGENCY SERVICE & PERSISTENCE
     ============================================================================= */
  describe('Emergency Service', () => {
    it('creates an emergency, validates input, and logs an activity event', async () => {
      const newEmergency: ActiveEmergency = {
        id: 'INC-TEST-999',
        location: 'Elante Mall, Phase 1, Industrial Area',
        emergencyType: 'Acute Cardiac Distress',
        severity: 'Critical',
        patientCount: 1,
        patientAge: 58,
        symptoms: ['Crushing chest pressure', 'Diaphoresis'],
        requiredCapability: 'ALS + Cardiac',
        notes: 'Security guard called on behalf of shopper.',
        status: 'Awaiting Dispatch',
        dispatchStage: 'Awaiting dispatch',
        assignedAmbulance: null,
        etaMinutes: null,
        reportedAt: '14:20 IST',
        timeline: [],
      };

      const created = await emergencyService.create(newEmergency);
      expect(created.id).toBe('INC-TEST-999');

      // Check persistence in repository
      const fetched = await emergencyService.getById('INC-TEST-999');
      expect(fetched).not.toBeNull();
      expect(fetched?.location).toBe('Elante Mall, Phase 1, Industrial Area');

      // Check that activity event was created
      const events = await activityService.getAll();
      const match = events.find((e) => e.title.includes('INC-TEST-999'));
      expect(match).toBeDefined();
      expect(match?.type).toBe('REQUEST_RECEIVED');
    });

    it('rejects emergency updates that violate state transitions', async () => {
      // Create a completed emergency
      const completedEmergency: ActiveEmergency = {
        id: 'INC-COMPLETED-TEST',
        location: 'Sector 35, Chandigarh',
        emergencyType: 'Minor Sprain',
        severity: 'Routine',
        patientCount: 1,
        requiredCapability: 'BLS',
        notes: 'Already treated and resolved.',
        status: 'Completed',
        dispatchStage: 'Completed',
        assignedAmbulance: null,
        etaMinutes: null,
        reportedAt: '10:00 IST',
        timeline: [],
      };
      await emergencyService.create(completedEmergency);

      await expect(
        emergencyService.update('INC-COMPLETED-TEST', { status: 'Dispatched' })
      ).rejects.toThrow(InvalidStateTransitionError);
    });
  });

  /* =============================================================================
     4. DISPATCH SERVICE & AMBULANCE STATUS MUTATION
     ============================================================================= */
  describe('Dispatch Service', () => {
    it('executes ambulance dispatch and synchronizes emergency and fleet state', async () => {
      // Find an available ambulance
      const ambulances = await ambulanceService.getAll();
      const targetAmb = ambulances.find((a) => a.status === 'AVAILABLE') || ambulances[0];

      const result = await dispatchService.dispatchAmbulance(
        'INC-4821',
        targetAmb.id,
        targetAmb.id,
        undefined,
        'Officer S. Sharma'
      );

      // 1. Emergency state updated
      expect(result.emergency.status).toBe('Dispatched');
      expect(result.emergency.assignedAmbulance).toBe(targetAmb.id);

      // 2. Ambulance state updated to EN_ROUTE
      expect(result.ambulance.status).toBe('EN_ROUTE');
      expect(result.ambulance.assignedIncident).toBe('INC-4821');

      // 3. Dispatch record persisted
      expect(result.dispatchRecord.emergencyId).toBe('INC-4821');
      expect(result.dispatchRecord.selectedAmbulanceId).toBe(targetAmb.id);
      expect(result.dispatchRecord.isOverride).toBe(false);

      // 4. Activity event logged
      const events = await activityService.getAll();
      const dispatchEvt = events.find(
        (e) => e.type === 'DISPATCH_AUTHORIZED' && e.title.includes(targetAmb.id)
      );
      expect(dispatchEvt).toBeDefined();
    });

    it('records dispatcher manual override reason accurately', async () => {
      // Create a fresh emergency for override testing
      const testEmergency: ActiveEmergency = {
        id: 'INC-OVERRIDE-TEST',
        location: 'Sector 22, Chandigarh',
        emergencyType: 'Acute Trauma',
        severity: 'Urgent',
        patientCount: 1,
        requiredCapability: 'ALS',
        notes: 'Override test',
        status: 'Awaiting Dispatch',
        dispatchStage: 'Awaiting dispatch',
        assignedAmbulance: null,
        etaMinutes: null,
        reportedAt: '12:00 IST',
        timeline: [],
      };
      await emergencyService.create(testEmergency);

      const ambulances = await ambulanceService.getAll();
      const availableUnits = ambulances.filter((a) => a.status === 'AVAILABLE');
      const recId = availableUnits[0].id;
      const overrideId = availableUnits[1].id;

      const result = await dispatchService.dispatchAmbulance(
        'INC-OVERRIDE-TEST',
        overrideId,
        recId,
        'Dispatcher familiar with local roadblock on Highway 21'
      );

      expect(result.dispatchRecord.isOverride).toBe(true);
      expect(result.dispatchRecord.overrideReason).toBe(
        'Dispatcher familiar with local roadblock on Highway 21'
      );
      expect(result.emergency.ambulanceDetails?.recommendationReason).toContain('Manual dispatcher selection');
    });
  });

  /* =============================================================================
     5. HOSPITAL PRE-ALERT & HANDOVER WORKFLOW
     ============================================================================= */
  describe('Hospital Alert Service', () => {
    it('executes complete pre-alert lifecycle: confirm -> dispatch -> send -> ack -> arrive -> handover', async () => {
      const hospitals = await hospitalService.getAll();
      const targetHosp = hospitals[0];
      const initialIncoming = targetHosp.currentIncomingPatients;

      const ambulances = await ambulanceService.getAll();
      const targetAmb = ambulances.find((a) => a.status === 'AVAILABLE') || ambulances[0];

      // 1. Dispatch Ambulance (moves INC-4821 from Awaiting Dispatch to Dispatched)
      await dispatchService.dispatchAmbulance(
        'INC-4821',
        targetAmb.id,
        targetAmb.id
      );

      // 2. Confirm Hospital
      const { emergency: confEm, hospital: confHosp, preAlert } = await alertService.confirmHospital(
        'INC-4821',
        targetHosp.id
      );
      expect(confEm.selectedHospitalId).toBe(targetHosp.id);
      expect(confHosp.currentIncomingPatients).toBe(initialIncoming + 1);
      expect(preAlert.status).toBe('READY_TO_SEND');

      // 3. Transmit Pre-Alert
      const sentAlert = await alertService.sendHospitalPreAlert('INC-4821');
      expect(sentAlert.status).toBe('SENT');
      expect(sentAlert.sentAt).toBeDefined();

      // 4. Hospital Acknowledges
      const ackAlert = await alertService.simulateHospitalAcknowledgement(
        'INC-4821',
        'Trauma Bay 1 ready. Dr. Verma on standby.'
      );
      expect(ackAlert.status).toBe('ACKNOWLEDGED');
      expect(ackAlert.acknowledgementNotes).toContain('Trauma Bay 1 ready');

      // 5. Ambulance Arrives at Hospital (moves from Dispatched to Transporting)
      const arriveAlert = await alertService.recordHospitalArrival('INC-4821');
      expect(arriveAlert.status).toBe('PATIENT_ARRIVED');
      const emArrived = await emergencyService.getById('INC-4821');
      expect(emArrived?.status).toBe('Transporting');
      expect(emArrived?.dispatchStage).toBe('Arrived');

      // 6. Complete Handover (moves from Transporting to Completed)
      const { emergency: completedEm, ambulance: releasedAmb } = await alertService.completeHospitalHandover(
        'INC-4821',
        'Patient safely transferred to ED Resuscitation team.'
      );
      expect(completedEm.status).toBe('Completed');
      expect(completedEm.dispatchStage).toBe('Completed');

      // Ambulance should be returned to AVAILABLE
      if (releasedAmb) {
        expect(releasedAmb.status).toBe('AVAILABLE');
        expect(releasedAmb.assignedIncident).toBeNull();
      }

      // Hospital incoming count should be decremented
      const updatedHosp = await hospitalService.getById(targetHosp.id);
      expect(updatedHosp?.currentIncomingPatients).toBe(initialIncoming);
    });
  });

  /* =============================================================================
     6. SINGLE SOURCE OF TRUTH: DYNAMIC TIMELINE PROJECTION
     ============================================================================= */
  describe('Dynamic Timeline Projection', () => {
    it('projects audit events into chronological incident timeline steps', async () => {
      const em = await emergencyService.getById('INC-4821');
      expect(em).not.toBeNull();

      const events = await activityService.getAll();
      const projected = activityService.projectTimeline(em!, events);

      expect(Array.isArray(projected)).toBe(true);
      expect(projected.length).toBeGreaterThanOrEqual(1);

      // Baseline event or matched event should have required fields
      const first = projected[0];
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('status');
      expect(first).toHaveProperty('detail');
    });
  });

  /* =============================================================================
     7. REPOSITORY RESET & DEMO MODE RESILIENCE
     ============================================================================= */
  describe('Repository Reset & Demo Mode Resilience', () => {
    it('restores all entities to default seed data when resetAll is invoked', async () => {
      // Mutate emergency
      await emergencyService.update('INC-4821', { notes: 'Mutated for testing' });
      const modified = await emergencyService.getById('INC-4821');
      expect(modified?.notes).toBe('Mutated for testing');

      // Reset
      await getRepositories().resetAll();

      const restored = await emergencyService.getById('INC-4821');
      expect(restored?.notes).not.toBe('Mutated for testing');
    });
  });
});
