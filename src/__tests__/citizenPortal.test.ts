import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ROLE_CONFIGS, canAccessRole } from '../types/roles';
import { emergencyService } from '../services/emergencyService';
import { dispatchService } from '../services/dispatchService';
import { simulationService } from '../realtime/simulationService';
import { eventBus } from '../realtime/eventBus';
import { getRepositories } from '../repositories';
import { getCoordinatesForIncident } from '../map/geoData';
import type { ActiveEmergency, PatientLocation } from '../types';

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

describe('RapidRoute Step 11: Citizen / Patient Experience Verification', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', new MockLocalStorage());
    await getRepositories().resetAll();
  });

  // =========================================================================
  // 1. ROLE-BASED ACCESS CONTROL & PRIVACY ISOLATION
  // =========================================================================
  describe('1. Role-Based Access Control & Privacy Isolation', () => {
    it('registers CITIZEN role with appropriate metadata', () => {
      const config = ROLE_CONFIGS.CITIZEN;
      expect(config).toBeDefined();
      expect(config.role).toBe('CITIZEN');
      expect(config.label).toBe('Citizen / Patient');
      expect(config.defaultPath).toBe('/citizen');
      expect(config.userBadge).toBe('CP');
    });

    it('allows citizen access strictly to citizen routes', () => {
      const allowed = [
        '/citizen',
        '/citizen/request',
        '/citizen/emergency',
        '/citizen/history',
        '/citizen/notifications',
        '/citizen/profile',
      ];

      for (const path of allowed) {
        expect(canAccessRole('CITIZEN', path)).toBe(true);
      }
    });

    it('strictly denies citizen access to internal operational and fleet workspaces', () => {
      const forbidden = [
        '/fleet',
        '/live-operations',
        '/analytics',
        '/overview',
        '/settings',
        '/hospital-operations',
        '/hospitals',
      ];

      for (const path of forbidden) {
        expect(canAccessRole('CITIZEN', path)).toBe(false);
      }
    });
  });

  // =========================================================================
  // 2. SHARED BACKEND EMERGENCY ARCHITECTURE
  // =========================================================================
  describe('2. Shared Backend Emergency Architecture', () => {
    it('creates an emergency via citizen request that is visible to dispatcher queue', async () => {
      const citizenLocation: PatientLocation = {
        address: 'Chitkara University, Rajpura',
        latitude: 30.5162,
        longitude: 76.6593,
        source: 'manual',
        subtext: 'Campus Main Gate, NH-07',
      };

      const citizenRequest: ActiveEmergency = {
        id: 'RR-9901',
        severity: 'Critical',
        location: citizenLocation.address,
        patientLocation: citizenLocation,
        emergencyType: 'Medical',
        patientCount: 1,
        requiredCapability: 'ALS + Cardiac',
        notes: 'Citizen reported faculty member collapsed in Administrative block.',
        status: 'Awaiting Dispatch',
        dispatchStage: 'Awaiting dispatch',
        assignedAmbulance: null,
        etaMinutes: null,
        reportedAt: '10:30 AM IST',
        timeline: [
          {
            title: 'Request Received',
            timestamp: '10:30 AM IST',
            detail: 'Logged via RapidRoute Citizen mobile portal.',
            status: 'completed',
          },
        ],
      };

      // Citizen creates emergency
      await emergencyService.create(citizenRequest);

      // Dispatcher reads the queue from shared emergency service
      const allEmergencies = await emergencyService.getAll();
      const createdInQueue = allEmergencies.find((e) => e.id === 'RR-9901');

      expect(createdInQueue).toBeDefined();
      expect(createdInQueue?.location).toBe('Chitkara University, Rajpura');
      expect(createdInQueue?.severity).toBe('Critical');
      expect(createdInQueue?.patientLocation?.latitude).toBeCloseTo(30.5162, 3);
      expect(createdInQueue?.patientLocation?.longitude).toBeCloseTo(76.6593, 3);
    });

    it('prioritizes citizen GPS coordinates in tactical map positioning', () => {
      const emergencyWithGps: ActiveEmergency = {
        id: 'RR-9902',
        severity: 'Critical',
        location: 'Custom Sector Chowk',
        patientLocation: {
          address: 'Custom Sector Chowk',
          latitude: 30.6850,
          longitude: 76.7550,
          source: 'current',
        },
        emergencyType: 'Accident',
        patientCount: 2,
        requiredCapability: 'ALS',
        notes: 'Collision at intersection',
        status: 'Awaiting Dispatch',
        dispatchStage: 'Awaiting dispatch',
        assignedAmbulance: null,
        etaMinutes: null,
        reportedAt: '10:35 AM IST',
        timeline: [],
      };

      const coords = getCoordinatesForIncident(emergencyWithGps);
      expect(coords[0]).toBe(30.6850);
      expect(coords[1]).toBe(76.7550);
    });
  });

  // =========================================================================
  // 3. REAL-TIME SYNCHRONIZATION: DISPATCHER TO CITIZEN
  // =========================================================================
  describe('3. Real-Time Synchronization', () => {
    it('synchronizes ambulance assignment to citizen when dispatcher assigns RR-204', async () => {
      // 1. Initial citizen request
      const incident: ActiveEmergency = {
        id: 'RR-8841',
        severity: 'Critical',
        location: 'Chitkara University, Rajpura',
        emergencyType: 'Medical',
        patientCount: 1,
        requiredCapability: 'ALS + Cardiac',
        notes: 'Chest pain call',
        status: 'Awaiting Dispatch',
        dispatchStage: 'Awaiting dispatch',
        assignedAmbulance: null,
        etaMinutes: null,
        reportedAt: '10:00 AM IST',
        timeline: [],
      };
      await emergencyService.create(incident);

      // 2. Dispatcher dispatches RR-204
      const dispatchResult = await dispatchService.dispatchAmbulance(
        'RR-8841',
        'RR-204',
        'RR-204'
      );

      expect(dispatchResult.emergency.assignedAmbulance).toBe('RR-204');
      expect(dispatchResult.emergency.status).toBe('Dispatched');
      expect(dispatchResult.emergency.dispatchStage).toBe('Dispatched');
      expect(dispatchResult.emergency.etaMinutes).toBeGreaterThan(0);
    });

    it('propagates ETA updates reactively across event bus', () => {
      let updatedEta: number | null = null;
      let targetEmergency: string | null = null;

      const unsubscribe = eventBus.on('ETA_UPDATED', (payload) => {
        targetEmergency = payload.emergencyId;
        updatedEta = payload.newEta;
      });

      // Simulation or CAD emits corridor speed adjustment
      eventBus.emit('ETA_UPDATED', {
        emergencyId: 'RR-8841',
        ambulanceId: 'RR-204',
        oldEta: 9,
        newEta: 4,
        reason: 'Cleared highway flyover',
      });

      expect(targetEmergency).toBe('RR-8841');
      expect(updatedEta).toBe(4);

      unsubscribe();
    });

    it('propagates receiving hospital selection to citizen', () => {
      let selectedHosp: string | null = null;

      const unsubscribe = eventBus.on('HOSPITAL_SELECTED', (payload) => {
        selectedHosp = payload.hospitalName;
      });

      eventBus.emit('HOSPITAL_SELECTED', {
        emergencyId: 'RR-8841',
        hospitalId: 'HOSP-01',
        hospitalName: 'City Emergency Hospital',
      });

      expect(selectedHosp).toBe('City Emergency Hospital');

      unsubscribe();
    });
  });

  // =========================================================================
  // 4. DETERMINISTIC MASTER DEMO LIFECYCLE (CITIZEN PERSPECTIVE)
  // =========================================================================
  describe('4. Deterministic Master Demo Scenario (Chitkara Cardiac)', () => {
    it('progresses through all 7 lifecycle stages deterministically', () => {
      simulationService.reset();

      // Stage 1: Emergency Created
      const initIncident = simulationService.loadCardiacScenario();
      expect(initIncident.id).toBe('INC-8841');
      expect(initIncident.location).toBe('Chitkara University, Rajpura');
      expect(simulationService.getStatus().currentStage).toBe(1);

      // Stage 2: Dispatched
      let status = simulationService.step();
      expect(status.currentStage).toBe(2);
      expect(status.stageName).toBe('Ambulance Dispatched');

      // Stage 3: ETA updated
      status = simulationService.step();
      expect(status.currentStage).toBe(3);
      expect(status.stageName).toBe('ETA Updated');

      // Stage 4: Pre-alert sent
      status = simulationService.step();
      expect(status.currentStage).toBe(4);
      expect(status.stageName).toBe('Pre-Alert Sent');

      // Stage 5: Hospital acknowledged
      status = simulationService.step();
      expect(status.currentStage).toBe(5);
      expect(status.stageName).toBe('Hospital Acknowledged');

      // Stage 6: Ambulance arrived
      status = simulationService.step();
      expect(status.currentStage).toBe(6);
      expect(status.stageName).toBe('Ambulance Arrived');

      // Stage 7: Handover completed
      status = simulationService.step();
      expect(status.currentStage).toBe(7);
      expect(status.stageName).toBe('Handover Completed');

      simulationService.reset();
    });
  });
});
