import { describe, it, expect, beforeEach } from 'vitest';
import { ROLE_CONFIGS, canAccessRole, type AppRole } from '../types/roles';
import { findBestAmbulance } from '../engine/dispatchEngine';
import { recommendHospital } from '../engine/hospitalSelectionEngine';
import { simulationService } from '../realtime/simulationService';
import { eventBus } from '../realtime/eventBus';
import type { Ambulance, Hospital, EmergencyDispatchInput, ActiveEmergency } from '../types';

describe('RapidRoute Step 10 — Role Switcher, Master Demo & Productization Verification', () => {
  beforeEach(() => {
    simulationService.reset();
  });

  // =========================================================================
  // 1. ROLE-BASED ACCESS CONTROL & PERSONAS
  // =========================================================================
  describe('1. Role-Based Access Control & Personas', () => {
    it('defines all 4 required operational personas with full metadata', () => {
      const roles: AppRole[] = ['DISPATCHER', 'OPERATIONS_MANAGER', 'HOSPITAL_OPERATOR', 'ADMIN'];
      expect(Object.keys(ROLE_CONFIGS)).toHaveLength(4);

      for (const role of roles) {
        const config = ROLE_CONFIGS[role];
        expect(config).toBeDefined();
        expect(config.role).toBe(role);
        expect(config.label).toBeTruthy();
        expect(config.userName).toBeTruthy();
        expect(config.userRoleTag).toBeTruthy();
        expect(config.userBadge).toMatch(/^[A-Z]{2}$/);
        expect(config.defaultPath).toBeTruthy();
        expect(config.allowedPaths.length).toBeGreaterThan(0);
      }
    });

    it('enforces correct default workspaces per role', () => {
      expect(ROLE_CONFIGS.DISPATCHER.defaultPath).toBe('/');
      expect(ROLE_CONFIGS.OPERATIONS_MANAGER.defaultPath).toBe('/overview');
      expect(ROLE_CONFIGS.HOSPITAL_OPERATOR.defaultPath).toBe('/hospital-operations');
      expect(ROLE_CONFIGS.ADMIN.defaultPath).toBe('/settings');
    });

    it('enforces strict role-based navigation permissions', () => {
      // Dispatcher
      expect(canAccessRole('DISPATCHER', '/')).toBe(true);
      expect(canAccessRole('DISPATCHER', '/live-operations')).toBe(true);
      expect(canAccessRole('DISPATCHER', '/overview')).toBe(false);
      expect(canAccessRole('DISPATCHER', '/hospital-operations')).toBe(false);
      expect(canAccessRole('DISPATCHER', '/settings')).toBe(false);

      // Operations Manager
      expect(canAccessRole('OPERATIONS_MANAGER', '/overview')).toBe(true);
      expect(canAccessRole('OPERATIONS_MANAGER', '/analytics')).toBe(true);
      expect(canAccessRole('OPERATIONS_MANAGER', '/fleet')).toBe(true);
      expect(canAccessRole('OPERATIONS_MANAGER', '/settings')).toBe(false);

      // Hospital Operator
      expect(canAccessRole('HOSPITAL_OPERATOR', '/hospital-operations')).toBe(true);
      expect(canAccessRole('HOSPITAL_OPERATOR', '/hospitals')).toBe(true);
      expect(canAccessRole('HOSPITAL_OPERATOR', '/overview')).toBe(false);
      expect(canAccessRole('HOSPITAL_OPERATOR', '/settings')).toBe(false);

      // Admin
      expect(canAccessRole('ADMIN', '/settings')).toBe(true);
      expect(canAccessRole('ADMIN', '/overview')).toBe(true);
      expect(canAccessRole('ADMIN', '/analytics')).toBe(true);
    });
  });

  // =========================================================================
  // 2. DETERMINISTIC MASTER DEMO SCENARIO (INC-8841)
  // =========================================================================
  describe('2. Deterministic Master Demo Scenario: Chitkara University Cardiac Emergency', () => {
    const cardiacEmergency: EmergencyDispatchInput = {
      id: 'INC-8841',
      location: 'Chitkara University, Rajpura',
      emergencyType: 'Acute Coronary Syndrome / Chest Pain',
      severity: 'Critical',
      patientCount: 1,
      requiredCapability: 'ALS + Cardiac',
    };

    const demoFleet: Ambulance[] = [
      {
        id: 'RR-101',
        currentArea: 'Rajpura Bypass',
        status: 'AVAILABLE',
        etaMinutes: 16,
        trafficCondition: 'Heavy',
        capability: 'ALS',
        driverName: 'Harpreet Singh',
        assignedIncident: null,
        lastUpdated: '22:40 IST',
        lat: 30.484,
        lng: 76.594,
      },
      {
        id: 'RR-204',
        currentArea: 'Zirakpur Flyover',
        status: 'AVAILABLE',
        etaMinutes: 9,
        trafficCondition: 'Light',
        capability: 'ALS + Cardiac',
        driverName: 'Vikram Mehta',
        assignedIncident: null,
        lastUpdated: '22:41 IST',
        lat: 30.642,
        lng: 76.817,
      },
      {
        id: 'RR-317',
        currentArea: 'Sector 17, Chandigarh',
        status: 'AVAILABLE',
        etaMinutes: 21,
        trafficCondition: 'Heavy',
        capability: 'BLS',
        driverName: 'Gurdeep Kaur',
        assignedIncident: null,
        lastUpdated: '22:39 IST',
        lat: 30.733,
        lng: 76.779,
      },
    ];

    it('selects RR-204 as fastest suitable ambulance over RR-101 and RR-317', () => {
      const decision = findBestAmbulance(cardiacEmergency, demoFleet);

      expect(decision.hasSuitableAmbulance).toBe(true);
      expect(decision.recommendedAmbulanceId).toBe('RR-204');
      expect(decision.etaMinutes).toBe(9);

      // RR-317 must be excluded due to lacking cardiac capability (BLS cannot handle Cardiac)
      const excludedIds = decision.excludedCandidates.map((c) => c.ambulance.id);
      expect(excludedIds).toContain('RR-317');

      // Check reason mentions cardiac or telemetry
      const rr317Exclusion = decision.excludedCandidates.find((c) => c.ambulance.id === 'RR-317');
      expect(rr317Exclusion?.exclusionReason).toMatch(/cardiac/i);
    });

    it('selects City Emergency Hospital over Regional Trauma Centre for cardiac care', () => {
      const activeInc: ActiveEmergency = {
        id: 'INC-8841',
        severity: 'Critical',
        location: 'Chitkara University, Rajpura',
        emergencyType: 'Acute Coronary Syndrome / Chest Pain',
        patientCount: 1,
        patientAge: 54,
        symptoms: ['Severe retrosternal chest pain', 'Breathing difficulty'],
        requiredCapability: 'ALS + Cardiac',
        notes: 'Profuse diaphoresis, retrosternal crushing pain.',
        status: 'Awaiting Dispatch',
        dispatchStage: 'Awaiting dispatch',
        assignedAmbulance: null,
        etaMinutes: 9,
        reportedAt: '22:41 IST',
        timeline: [],
      };

      const hospitalNetwork: Hospital[] = [
        {
          id: 'HOSP-01',
          name: 'City Emergency Hospital',
          location: { lat: 30.486, lng: 76.598 },
          area: 'Rajpura',
          distanceKm: 4.8,
          emergencyStatus: 'ready',
          edStatus: 'Ready',
          capabilities: ['Cardiac', 'Trauma', 'Emergency Surgery', 'ICU'],
          emergencyCapability: 'Level 1 Trauma & Cardiac',
          icuBedsAvailable: 3,
          icuBedsTotal: 10,
          emergencyBedsAvailable: 6,
          emergencyBedsTotal: 15,
          cardiacUnit: true,
          traumaLevel: 'Level I',
          currentIncomingPatients: 1,
          incomingPatients: 1,
          contactStatus: 'online',
        },
        {
          id: 'HOSP-06',
          name: 'Regional Trauma Centre',
          location: { lat: 30.54, lng: 76.61 },
          area: 'Rajpura South',
          distanceKm: 6.2,
          emergencyStatus: 'ready',
          edStatus: 'Ready',
          capabilities: ['Trauma', 'Emergency Surgery', 'ICU', 'Orthopedic'],
          emergencyCapability: 'Level 1 Regional Trauma Centre',
          icuBedsAvailable: 4,
          icuBedsTotal: 10,
          emergencyBedsAvailable: 5,
          emergencyBedsTotal: 14,
          cardiacUnit: false, // Lacks 24/7 cardiac cath lab
          traumaLevel: 'Level I',
          currentIncomingPatients: 1,
          incomingPatients: 1,
          contactStatus: 'online',
        },
      ];

      const result = recommendHospital(activeInc, hospitalNetwork);

      expect(result.hasSuitableHospital).toBe(true);
      expect(result.recommendedHospitalId).toBe('HOSP-01');
      expect(result.recommendedHospital?.name).toBe('City Emergency Hospital');

      // Regional Trauma Centre must be excluded or ranked lower due to lack of cardiac unit
      const excludedIds = result.excludedHospitals.map((h) => h.hospital.id);
      expect(excludedIds).toContain('HOSP-06');
      const hosp06Exclusion = result.excludedHospitals.find((h) => h.hospital.id === 'HOSP-06');
      expect(hosp06Exclusion?.reason).toMatch(/cardiac/i);
    });
  });

  // =========================================================================
  // 3. DISCRETE SIMULATION SERVICE TRIGGERS
  // =========================================================================
  describe('3. Simulation Service Discrete Triggers & Lifecycle', () => {
    it('loadCardiacScenario initializes INC-8841 and emits EMERGENCY_CREATED', () => {
      let createdEmergency: any = null;
      const unsubscribe = eventBus.on('EMERGENCY_CREATED', (payload) => {
        createdEmergency = payload.emergency;
      });

      const inc = simulationService.loadCardiacScenario();
      expect(inc.id).toBe('INC-8841');
      expect(inc.location).toContain('Chitkara');
      expect(inc.requiredCapability).toBe('ALS + Cardiac');
      expect(simulationService.getStatus().currentStage).toBe(1);

      expect(createdEmergency).not.toBeNull();
      expect(createdEmergency.id).toBe('INC-8841');

      unsubscribe();
    });

    it('simulates discrete ambulance dispatch', () => {
      let dispatchedPayload: any = null;
      const unsub = eventBus.on('AMBULANCE_DISPATCHED', (payload) => {
        dispatchedPayload = payload;
      });

      simulationService.simulateAmbulanceDispatch('RR-204');
      expect(simulationService.getStatus().currentStage).toBe(2);
      expect(dispatchedPayload).not.toBeNull();
      expect(dispatchedPayload.ambulanceId).toBe('RR-204');
      expect(dispatchedPayload.emergencyId).toBe('INC-8841');

      unsub();
    });

    it('simulates ETA progression update', () => {
      let etaPayload: any = null;
      const unsub = eventBus.on('ETA_UPDATED', (payload) => {
        etaPayload = payload;
      });

      simulationService.simulateEtaUpdate(4, 'Express corridor cleared');
      expect(simulationService.getStatus().currentStage).toBe(3);
      expect(etaPayload).not.toBeNull();
      expect(etaPayload.newEta).toBe(4);
      expect(etaPayload.reason).toBe('Express corridor cleared');

      unsub();
    });

    it('simulates hospital pre-alert transmission and acknowledgement', () => {
      let sentAlert: any = null;
      let ackAlert: any = null;

      const unsubSent = eventBus.on('PRE_ALERT_SENT', (payload) => {
        sentAlert = payload.preAlert;
      });
      const unsubAck = eventBus.on('PRE_ALERT_ACKNOWLEDGED', (payload) => {
        ackAlert = payload.preAlert;
      });

      simulationService.simulateHospitalPreAlert('HOSP-01');
      expect(simulationService.getStatus().currentStage).toBe(4);
      expect(sentAlert).not.toBeNull();
      expect(sentAlert.hospitalId).toBe('HOSP-01');

      simulationService.simulateHospitalAck('Cath lab prepped and ready.');
      expect(simulationService.getStatus().currentStage).toBe(5);
      expect(ackAlert).not.toBeNull();
      expect(ackAlert.status).toBe('ACKNOWLEDGED');
      expect(ackAlert.acknowledgementNotes).toContain('Cath lab');

      unsubSent();
      unsubAck();
    });

    it('simulates ambulance arrival, clinical handover, and fleet release', () => {
      let arrivedCalled = false;
      let handoverCompleted = false;
      let releasedStatus: any = null;

      const unsubArr = eventBus.on('AMBULANCE_ARRIVED', () => {
        arrivedCalled = true;
      });
      const unsubHandover = eventBus.on('HANDOVER_COMPLETED', () => {
        handoverCompleted = true;
      });
      const unsubStatus = eventBus.on('AMBULANCE_STATUS_CHANGED', (payload) => {
        if (payload.ambulanceId === 'RR-204') {
          releasedStatus = payload.status;
        }
      });

      simulationService.simulateAmbulanceArrival();
      expect(simulationService.getStatus().currentStage).toBe(6);
      expect(arrivedCalled).toBe(true);

      simulationService.simulateHandover('Dr. Verma received patient in Cath Lab');
      expect(simulationService.getStatus().currentStage).toBe(7);
      expect(handoverCompleted).toBe(true);
      expect(releasedStatus).toBe('AVAILABLE');

      unsubArr();
      unsubHandover();
      unsubStatus();
    });

    it('resets scenario cleanly back to stage 0', () => {
      simulationService.loadCardiacScenario();
      expect(simulationService.getStatus().currentStage).toBe(1);

      simulationService.resetScenario();
      expect(simulationService.getStatus().currentStage).toBe(0);
      expect(simulationService.getStatus().isRunning).toBe(false);
    });
  });
});
