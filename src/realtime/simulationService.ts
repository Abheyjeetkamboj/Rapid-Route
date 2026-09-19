import { eventBus } from './eventBus';
import type { ActiveEmergency, DispatchSelectionRecord, HospitalPreAlert } from '../types';

export interface SimulationStatus {
  isRunning: boolean;
  currentStage: number;
  totalStages: number;
  stageName: string;
  stageDescription: string;
}

export const SIMULATION_STAGES = [
  { stage: 0, name: 'Idle', description: 'Deterministic master demo ready (INC-8841 at Chitkara University)' },
  { stage: 1, name: 'Emergency Created', description: 'Critical cardiac call received at Chitkara University (INC-8841)' },
  { stage: 2, name: 'Ambulance Dispatched', description: 'RR-204 dispatched and changes status to EN ROUTE' },
  { stage: 3, name: 'ETA Updated', description: 'Corridor progression: ETA decreases from 9m to 4m (cleared flyover)' },
  { stage: 4, name: 'Pre-Alert Sent', description: 'Automated HL7 clinical alert transmitted to City Emergency Hospital' },
  { stage: 5, name: 'Hospital Acknowledged', description: 'Trauma bay & Cath lab team confirmed on standby' },
  { stage: 6, name: 'Ambulance Arrived', description: 'Vehicle enters City Emergency Hospital intake bay' },
  { stage: 7, name: 'Handover Completed', description: 'Clinical transfer completed; RR-204 released to AVAILABLE' },
];

type SimulationListener = (status: SimulationStatus) => void;

export class SimulationService {
  private currentStage = 0;
  private isRunning = false;
  private timer: any = null;
  private listeners = new Set<SimulationListener>();

  public getStatus(): SimulationStatus {
    const meta = SIMULATION_STAGES[this.currentStage] || SIMULATION_STAGES[0];
    return {
      isRunning: this.isRunning,
      currentStage: this.currentStage,
      totalStages: 7,
      stageName: meta.name,
      stageDescription: meta.description,
    };
  }

  public onStatusChange(listener: SimulationListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }

  public start(stepIntervalMs = 4500): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.notify();

    if (this.currentStage >= 7) {
      this.currentStage = 0;
    }

    this.timer = setInterval(() => {
      if (this.currentStage < 7) {
        this.step();
      } else {
        this.pause();
      }
    }, stepIntervalMs);

    // Run first step immediately if starting from 0
    if (this.currentStage === 0) {
      this.step();
    }
  }

  public pause(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  public step(): SimulationStatus {
    if (this.currentStage >= 7) {
      this.pause();
      return this.getStatus();
    }

    this.currentStage++;
    this.executeStage(this.currentStage);
    this.notify();
    return this.getStatus();
  }

  public reset(): SimulationStatus {
    this.pause();
    this.currentStage = 0;
    this.notify();
    return this.getStatus();
  }

  // =========================================================
  // DISCRETE SIMULATION TRIGGERS FOR MANUAL DEMO
  // =========================================================

  /**
   * Loads the deterministic Master Demo Scenario:
   * Location: Chitkara University, Rajpura
   * Condition: Severe chest pain + breathing difficulty
   * Severity: Critical, Patient: 1, Required: ALS + Cardiac
   * Fleet: RR-101 (3.2km, heavy traffic, ALS, 16m), RR-204 (5.8km, light traffic, ALS+Cardiac, 9m), RR-317 (4.1km, heavy traffic, BLS, 21m)
   * Hospital: City Emergency Hospital (Ready, 10m, Cardiac)
   */
  public loadCardiacScenario(): ActiveEmergency {
    this.pause();
    this.currentStage = 1;

    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    const simEmergency: ActiveEmergency = {
      id: 'INC-8841',
      severity: 'Critical',
      location: 'Chitkara University, Rajpura',
      emergencyType: 'Acute Coronary Syndrome / Chest Pain',
      patientCount: 1,
      patientAge: 54,
      symptoms: ['Severe retrosternal chest pain', 'Breathing difficulty', 'Profuse diaphoresis', 'Radiation to left shoulder'],
      requiredCapability: 'ALS + Cardiac',
      notes: '54-year-old faculty member collapsed in administrative block. Profuse sweating, severe chest pain radiating to left arm and breathing difficulty. Campus medical responder administered sublingual aspirin.',
      status: 'Awaiting Dispatch',
      dispatchStage: 'Awaiting dispatch',
      assignedAmbulance: null,
      etaMinutes: 9,
      reportedAt: nowTime,
      ambulanceDetails: {
        id: 'RR-204',
        etaMinutes: 9,
        capability: 'ALS + Cardiac',
        traffic: 'Light',
        currentStatus: 'AVAILABLE',
        driverName: 'Vikram Mehta',
        recommendationReason: 'Optimal match: specialized cardiac monitoring telemetry and avoids heavy arterial NH-7 traffic (9 min vs 16 min for RR-101).',
      },
      recommendedHospital: {
        id: 'HOSP-01',
        name: 'City Emergency Hospital',
        readiness: 'Ready',
        etaMinutes: 10,
        preAlertStatus: 'Pending Dispatch',
        icuBedsAvailable: 3,
        traumaLevel: 'Level I Trauma & Cardiac',
      },
      timeline: [
        {
          title: 'Emergency call received',
          timestamp: nowTime,
          detail: 'Direct CAD triage intake from Chitkara University medical station',
          status: 'completed',
        },
        {
          title: 'AI clinical assessment completed',
          timestamp: nowTime,
          detail: 'Acuity: Critical • Required equipment: ALS + Cardiac (Defibrillator & 12-lead ECG telemetry)',
          status: 'completed',
        },
        {
          title: 'Deterministic dispatch evaluation',
          timestamp: nowTime,
          detail: 'RR-204 selected as fastest suitable unit (9m ETA). RR-101 delayed by heavy traffic (16m), RR-317 lacks cardiac monitoring capability.',
          status: 'completed',
        },
        {
          title: 'Dispatcher verification & dispatch',
          timestamp: undefined,
          detail: 'Awaiting dispatcher verification and authorization',
          status: 'current',
        },
      ],
      selectedHospitalId: 'HOSP-01',
    };

    // Ensure candidate fleet is set in AVAILABLE state with demo metrics
    eventBus.emit('AMBULANCE_STATUS_CHANGED', {
      ambulanceId: 'RR-101',
      status: 'AVAILABLE',
      assignedIncident: null,
    });
    eventBus.emit('AMBULANCE_STATUS_CHANGED', {
      ambulanceId: 'RR-204',
      status: 'AVAILABLE',
      assignedIncident: null,
    });
    eventBus.emit('AMBULANCE_STATUS_CHANGED', {
      ambulanceId: 'RR-317',
      status: 'AVAILABLE',
      assignedIncident: null,
    });

    eventBus.emit('EMERGENCY_CREATED', { emergency: simEmergency });
    this.notify();
    return simEmergency;
  }

  public resetScenario(): void {
    this.reset();
    eventBus.emit('AMBULANCE_STATUS_CHANGED', {
      ambulanceId: 'RR-101',
      status: 'AVAILABLE',
      assignedIncident: null,
    });
    eventBus.emit('AMBULANCE_STATUS_CHANGED', {
      ambulanceId: 'RR-204',
      status: 'AVAILABLE',
      assignedIncident: null,
    });
    eventBus.emit('AMBULANCE_STATUS_CHANGED', {
      ambulanceId: 'RR-317',
      status: 'AVAILABLE',
      assignedIncident: null,
    });
  }

  public triggerNewEmergency(): ActiveEmergency {
    return this.loadCardiacScenario();
  }

  public simulateAmbulanceDispatch(ambulanceId = 'RR-204'): void {
    this.currentStage = 2;
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    const record: DispatchSelectionRecord = {
      emergencyId: 'INC-8841',
      recommendedAmbulanceId: 'RR-204',
      selectedAmbulanceId: ambulanceId,
      isOverride: false,
      timestamp: nowTime,
      authorizedBy: 'Officer S. Sharma',
    };

    eventBus.emit('AMBULANCE_DISPATCHED', {
      emergencyId: 'INC-8841',
      ambulanceId,
      recommendedAmbulanceId: 'RR-204',
      isOverride: false,
      dispatchRecord: record,
    });

    eventBus.emit('AMBULANCE_STATUS_CHANGED', {
      ambulanceId,
      status: 'EN_ROUTE',
      assignedIncident: 'INC-8841',
    });

    this.notify();
  }

  public simulateEtaUpdate(newEta = 4, reason = 'Cleared Zirakpur highway flyover - Express corridor established'): void {
    this.currentStage = 3;
    eventBus.emit('ETA_UPDATED', {
      emergencyId: 'INC-8841',
      ambulanceId: 'RR-204',
      oldEta: 9,
      newEta,
      reason,
    });
    this.notify();
  }

  public simulateHospitalPreAlert(hospitalId = 'HOSP-01'): void {
    this.currentStage = 4;
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    const preAlert: HospitalPreAlert = {
      id: 'ALERT-INC-8841-HOSP-01',
      incidentId: 'INC-8841',
      severity: 'Critical',
      emergencyType: 'Acute Coronary Syndrome / Chest Pain',
      patientCount: 1,
      patientAge: 54,
      symptoms: ['Severe retrosternal chest pain', 'Breathing difficulty', 'Profuse diaphoresis'],
      ambulanceId: 'RR-204',
      ambulanceEta: 4,
      hospitalId,
      hospitalName: 'City Emergency Hospital',
      requiredPreparation: 'Acute Resuscitation Bay 1 & Primary PCI Cath Lab Standby',
      sentAt: nowTime,
      status: 'SENT',
    };

    eventBus.emit('PRE_ALERT_SENT', {
      emergencyId: 'INC-8841',
      hospitalId,
      preAlert,
    });

    this.notify();
  }

  public simulateHospitalAck(notes = 'Dr. Verma on standby. Cath lab team notified and scrubbed.'): void {
    this.currentStage = 5;
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    const preAlert: HospitalPreAlert = {
      id: 'ALERT-INC-8841-HOSP-01',
      incidentId: 'INC-8841',
      severity: 'Critical',
      emergencyType: 'Acute Coronary Syndrome / Chest Pain',
      patientCount: 1,
      patientAge: 54,
      symptoms: ['Severe retrosternal chest pain', 'Breathing difficulty', 'Profuse diaphoresis'],
      ambulanceId: 'RR-204',
      ambulanceEta: 3,
      hospitalId: 'HOSP-01',
      hospitalName: 'City Emergency Hospital',
      requiredPreparation: 'Acute Resuscitation Bay 1 & Primary PCI Cath Lab Standby',
      sentAt: nowTime,
      acknowledgedAt: nowTime,
      status: 'ACKNOWLEDGED',
      acknowledgementNotes: notes,
    };

    eventBus.emit('PRE_ALERT_ACKNOWLEDGED', {
      emergencyId: 'INC-8841',
      hospitalId: 'HOSP-01',
      preAlert,
      notes,
    });

    this.notify();
  }

  public simulateAmbulanceArrival(): void {
    this.currentStage = 6;
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    const preAlert: HospitalPreAlert = {
      id: 'ALERT-INC-8841-HOSP-01',
      incidentId: 'INC-8841',
      severity: 'Critical',
      emergencyType: 'Acute Coronary Syndrome / Chest Pain',
      patientCount: 1,
      patientAge: 54,
      symptoms: ['Severe retrosternal chest pain', 'Breathing difficulty', 'Profuse diaphoresis'],
      ambulanceId: 'RR-204',
      ambulanceEta: 0,
      hospitalId: 'HOSP-01',
      hospitalName: 'City Emergency Hospital',
      requiredPreparation: 'Acute Resuscitation Bay 1 & Primary PCI Cath Lab Standby',
      sentAt: nowTime,
      acknowledgedAt: nowTime,
      arrivedAt: nowTime,
      status: 'PATIENT_ARRIVED',
    };

    eventBus.emit('AMBULANCE_ARRIVED', {
      emergencyId: 'INC-8841',
      ambulanceId: 'RR-204',
      hospitalId: 'HOSP-01',
      preAlert,
    });

    this.notify();
  }

  public simulateHandover(notes = 'Clinical handover completed to Dr. Verma; transfer to Cath Lab 1'): void {
    this.currentStage = 7;
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    const preAlert: HospitalPreAlert = {
      id: 'ALERT-INC-8841-HOSP-01',
      incidentId: 'INC-8841',
      severity: 'Critical',
      emergencyType: 'Acute Coronary Syndrome / Chest Pain',
      patientCount: 1,
      patientAge: 54,
      symptoms: ['Severe retrosternal chest pain', 'Breathing difficulty', 'Profuse diaphoresis'],
      ambulanceId: 'RR-204',
      ambulanceEta: 0,
      hospitalId: 'HOSP-01',
      hospitalName: 'City Emergency Hospital',
      requiredPreparation: 'Acute Resuscitation Bay 1 & Primary PCI Cath Lab Standby',
      sentAt: nowTime,
      acknowledgedAt: nowTime,
      arrivedAt: nowTime,
      handoverCompletedAt: nowTime,
      acknowledgementNotes: notes,
      status: 'HANDOVER_COMPLETED',
    };

    eventBus.emit('HANDOVER_COMPLETED', {
      emergencyId: 'INC-8841',
      ambulanceId: 'RR-204',
      hospitalId: 'HOSP-01',
      preAlert,
    });

    eventBus.emit('INCIDENT_COMPLETED', {
      emergencyId: 'INC-8841',
      completedAt: nowTime,
    });

    // Release ambulance back to AVAILABLE
    eventBus.emit('AMBULANCE_STATUS_CHANGED', {
      ambulanceId: 'RR-204',
      status: 'AVAILABLE',
      assignedIncident: null,
    });

    this.notify();
  }

  // =========================================================
  // AUTOMATED STAGE EXECUTION
  // =========================================================

  private executeStage(stage: number): void {
    switch (stage) {
      case 1:
        this.loadCardiacScenario();
        break;
      case 2:
        this.simulateAmbulanceDispatch('RR-204');
        break;
      case 3:
        this.simulateEtaUpdate(4, 'Cleared Zirakpur highway flyover - Express corridor established');
        break;
      case 4:
        this.simulateHospitalPreAlert('HOSP-01');
        break;
      case 5:
        this.simulateHospitalAck('Dr. Verma on standby. Cath lab team notified and scrubbed.');
        break;
      case 6:
        this.simulateAmbulanceArrival();
        break;
      case 7:
        this.simulateHandover('Clinical transfer completed to Dr. Verma in Cath Lab 1');
        break;
    }
  }
}

export const simulationService = new SimulationService();
