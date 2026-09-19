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
  { stage: 0, name: 'Idle', description: 'Demo simulation ready to start' },
  { stage: 1, name: 'Emergency Created', description: 'Critical STEMI call received (INC-8852)' },
  { stage: 2, name: 'Ambulance Dispatched', description: 'RR-204 dispatched and changes to EN ROUTE' },
  { stage: 3, name: 'ETA Updated', description: 'Corridor progression: ETA decreases from 8m to 4m' },
  { stage: 4, name: 'Pre-Alert Sent', description: 'HL7 clinical alert transmitted to City Emergency Hospital' },
  { stage: 5, name: 'Hospital Acknowledged', description: 'Trauma bay & Cath lab confirmed on standby' },
  { stage: 6, name: 'Ambulance Arrived', description: 'Vehicle enters hospital intake bay' },
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

  private executeStage(stage: number): void {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    switch (stage) {
      case 1: {
        // Stage 1: New Emergency Created
        const simEmergency: ActiveEmergency = {
          id: 'INC-8852',
          severity: 'Critical',
          location: 'Rajpura Grain Market, GT Road',
          emergencyType: 'Acute Myocardial Infarction',
          patientCount: 1,
          patientAge: 52,
          symptoms: ['Crushing chest pressure', 'Profuse diaphoresis', 'Dyspnea'],
          requiredCapability: 'ALS + Cardiac',
          notes: 'Shop manager collapsed suddenly. Bystanders initiated chest compressions.',
          status: 'Awaiting Dispatch',
          dispatchStage: 'Awaiting dispatch',
          assignedAmbulance: null,
          etaMinutes: 8,
          reportedAt: nowTime,
          timeline: [],
          selectedHospitalId: 'HOSP-01',
          recommendedHospital: {
            id: 'HOSP-01',
            name: 'City Emergency Hospital',
            readiness: 'Ready',
            etaMinutes: 7,
            preAlertStatus: 'Pending Dispatch',
            icuBedsAvailable: 3,
            traumaLevel: 'Level I Trauma',
          },
        };

        eventBus.emit('EMERGENCY_CREATED', { emergency: simEmergency });
        break;
      }

      case 2: {
        // Stage 2: Ambulance Dispatched
        const record: DispatchSelectionRecord = {
          emergencyId: 'INC-8852',
          recommendedAmbulanceId: 'RR-204',
          selectedAmbulanceId: 'RR-204',
          isOverride: false,
          timestamp: nowTime,
          authorizedBy: 'Officer S. Sharma',
        };

        eventBus.emit('AMBULANCE_DISPATCHED', {
          emergencyId: 'INC-8852',
          ambulanceId: 'RR-204',
          recommendedAmbulanceId: 'RR-204',
          isOverride: false,
          dispatchRecord: record,
        });

        eventBus.emit('AMBULANCE_STATUS_CHANGED', {
          ambulanceId: 'RR-204',
          status: 'EN_ROUTE',
          assignedIncident: 'INC-8852',
        });
        break;
      }

      case 3: {
        // Stage 3: ETA Updated
        eventBus.emit('ETA_UPDATED', {
          emergencyId: 'INC-8852',
          ambulanceId: 'RR-204',
          oldEta: 8,
          newEta: 4,
          reason: 'Cleared Zirakpur highway flyover',
        });
        break;
      }

      case 4: {
        // Stage 4: Pre-Alert Sent
        const preAlert: HospitalPreAlert = {
          id: 'ALERT-INC-8852-HOSP-01',
          incidentId: 'INC-8852',
          severity: 'Critical',
          emergencyType: 'Acute Myocardial Infarction',
          patientCount: 1,
          patientAge: 52,
          symptoms: ['Crushing chest pressure', 'Profuse diaphoresis'],
          ambulanceId: 'RR-204',
          ambulanceEta: 4,
          hospitalId: 'HOSP-01',
          hospitalName: 'City Emergency Hospital',
          requiredPreparation: 'Acute Resuscitation Bay 2 & Primary PCI Team Activation',
          sentAt: nowTime,
          status: 'SENT',
        };

        eventBus.emit('PRE_ALERT_SENT', {
          emergencyId: 'INC-8852',
          hospitalId: 'HOSP-01',
          preAlert,
        });
        break;
      }

      case 5: {
        // Stage 5: Hospital Acknowledged
        const preAlert: HospitalPreAlert = {
          id: 'ALERT-INC-8852-HOSP-01',
          incidentId: 'INC-8852',
          severity: 'Critical',
          emergencyType: 'Acute Myocardial Infarction',
          patientCount: 1,
          patientAge: 52,
          symptoms: ['Crushing chest pressure', 'Profuse diaphoresis'],
          ambulanceId: 'RR-204',
          ambulanceEta: 3,
          hospitalId: 'HOSP-01',
          hospitalName: 'City Emergency Hospital',
          requiredPreparation: 'Acute Resuscitation Bay 2 & Primary PCI Team Activation',
          sentAt: nowTime,
          acknowledgedAt: nowTime,
          status: 'ACKNOWLEDGED',
          acknowledgementNotes: 'Dr. Verma on standby. Cath lab team notified and scrubbed.',
        };

        eventBus.emit('PRE_ALERT_ACKNOWLEDGED', {
          emergencyId: 'INC-8852',
          hospitalId: 'HOSP-01',
          preAlert,
          notes: 'Dr. Verma on standby. Cath lab team notified and scrubbed.',
        });
        break;
      }

      case 6: {
        // Stage 6: Ambulance Arrived
        const preAlert: HospitalPreAlert = {
          id: 'ALERT-INC-8852-HOSP-01',
          incidentId: 'INC-8852',
          severity: 'Critical',
          emergencyType: 'Acute Myocardial Infarction',
          patientCount: 1,
          patientAge: 52,
          symptoms: ['Crushing chest pressure', 'Profuse diaphoresis'],
          ambulanceId: 'RR-204',
          ambulanceEta: 0,
          hospitalId: 'HOSP-01',
          hospitalName: 'City Emergency Hospital',
          requiredPreparation: 'Acute Resuscitation Bay 2 & Primary PCI Team Activation',
          sentAt: nowTime,
          acknowledgedAt: nowTime,
          arrivedAt: nowTime,
          status: 'PATIENT_ARRIVED',
        };

        eventBus.emit('AMBULANCE_ARRIVED', {
          emergencyId: 'INC-8852',
          ambulanceId: 'RR-204',
          hospitalId: 'HOSP-01',
          preAlert,
        });
        break;
      }

      case 7: {
        // Stage 7: Handover Completed
        const preAlert: HospitalPreAlert = {
          id: 'ALERT-INC-8852-HOSP-01',
          incidentId: 'INC-8852',
          severity: 'Critical',
          emergencyType: 'Acute Myocardial Infarction',
          patientCount: 1,
          patientAge: 52,
          symptoms: ['Crushing chest pressure', 'Profuse diaphoresis'],
          ambulanceId: 'RR-204',
          ambulanceEta: 0,
          hospitalId: 'HOSP-01',
          hospitalName: 'City Emergency Hospital',
          requiredPreparation: 'Acute Resuscitation Bay 2 & Primary PCI Team Activation',
          sentAt: nowTime,
          acknowledgedAt: nowTime,
          arrivedAt: nowTime,
          handoverCompletedAt: nowTime,
          status: 'HANDOVER_COMPLETED',
        };

        eventBus.emit('HANDOVER_COMPLETED', {
          emergencyId: 'INC-8852',
          ambulanceId: 'RR-204',
          hospitalId: 'HOSP-01',
          preAlert,
        });

        eventBus.emit('INCIDENT_COMPLETED', {
          emergencyId: 'INC-8852',
          completedAt: nowTime,
        });

        // Release ambulance back to AVAILABLE
        eventBus.emit('AMBULANCE_STATUS_CHANGED', {
          ambulanceId: 'RR-204',
          status: 'AVAILABLE',
          assignedIncident: null,
        });
        break;
      }
    }
  }
}

export const simulationService = new SimulationService();
