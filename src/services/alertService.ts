import type { ActiveEmergency, Ambulance, Hospital, HospitalPreAlert } from '../types';
import { getRepositories } from '../repositories';
import { emergencyService } from './emergencyService';
import { ambulanceService } from './ambulanceService';
import { hospitalService } from './hospitalService';
import { activityService } from './activityService';
import { validateAlertTransition } from './statusLifecycle';
import {
  generateHospitalPreAlert,
  simulateHospitalAcknowledgement as serviceSimulateAck,
  recordHospitalArrival as serviceRecordArrival,
  completeHospitalHandover as serviceCompleteHandover,
} from './preAlertService';

export class AlertService {
  async getAllAlerts(): Promise<HospitalPreAlert[]> {
    return getRepositories().alerts.getAll();
  }

  async getAlertForEmergency(emergencyId: string): Promise<HospitalPreAlert | null> {
    return getRepositories().alerts.getByEmergencyId(emergencyId);
  }

  async confirmHospital(
    emergencyId: string,
    hospitalId: string
  ): Promise<{ emergency: ActiveEmergency; hospital: Hospital; preAlert: HospitalPreAlert }> {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    const emergency = await emergencyService.getById(emergencyId);
    if (!emergency) throw new Error(`Emergency not found: ${emergencyId}`);

    const hospital = await hospitalService.getById(hospitalId);
    if (!hospital) throw new Error(`Hospital not found: ${hospitalId}`);

    const assignedAmb = emergency.assignedAmbulance
      ? await ambulanceService.getById(emergency.assignedAmbulance)
      : null;

    const preAlert = generateHospitalPreAlert(
      emergency,
      assignedAmb || { id: emergency.assignedAmbulance || 'RR-204', etaMinutes: emergency.etaMinutes || 8 },
      hospital
    );

    // Persist alert
    await getRepositories().alerts.create(preAlert);

    // Increment hospital incoming patients
    const updatedHospital = await hospitalService.adjustIncomingPatients(hospitalId, 1);

    // Update emergency
    const updatedEmergency = await emergencyService.update(emergencyId, {
      selectedHospitalId: hospitalId,
      hospitalConfirmedAt: nowTime,
      preAlert,
      recommendedHospital: {
        id: hospital.id,
        name: hospital.name,
        readiness: hospital.edStatus,
        etaMinutes: preAlert.ambulanceEta,
        preAlertStatus: 'Pending Dispatch',
        icuBedsAvailable: hospital.icuBedsAvailable,
        traumaLevel: hospital.traumaLevel,
      },
    });

    // Log activity
    await activityService.logEvent(
      `Hospital confirmed: ${hospital.name}`,
      `Designated receiving center for incident ${emergencyId} (${hospital.traumaLevel}).`,
      'HOSPITAL_ALERT',
      emergencyId
    );

    return { emergency: updatedEmergency, hospital: updatedHospital, preAlert };
  }

  async sendHospitalPreAlert(emergencyId: string): Promise<HospitalPreAlert> {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    const emergency = await emergencyService.getById(emergencyId);
    if (!emergency || !emergency.preAlert) {
      throw new Error(`Pre-alert not found for emergency: ${emergencyId}`);
    }

    validateAlertTransition(emergency.preAlert.status, 'SENT');

    const updatedPreAlert: HospitalPreAlert = {
      ...emergency.preAlert,
      status: 'SENT',
      sentAt: nowTime,
    };

    await getRepositories().alerts.update(emergency.preAlert.id, updatedPreAlert);

    await emergencyService.update(emergencyId, {
      preAlert: updatedPreAlert,
      recommendedHospital: emergency.recommendedHospital
        ? { ...emergency.recommendedHospital, preAlertStatus: 'Transmitted' }
        : undefined,
    });

    await activityService.logEvent(
      `HL7 Pre-Alert transmitted to ${emergency.preAlert.hospitalName}`,
      `Incident ${emergencyId} clinical data sent. Resuscitation prep initiated.`,
      'HOSPITAL_ALERT',
      emergencyId
    );

    return updatedPreAlert;
  }

  async simulateHospitalAcknowledgement(emergencyId: string, notes?: string): Promise<HospitalPreAlert> {
    const emergency = await emergencyService.getById(emergencyId);
    if (!emergency || !emergency.preAlert) {
      throw new Error(`Pre-alert not found for emergency: ${emergencyId}`);
    }

    validateAlertTransition(emergency.preAlert.status, 'ACKNOWLEDGED');

    const updatedPreAlert = serviceSimulateAck(emergency.preAlert, notes);

    await getRepositories().alerts.update(emergency.preAlert.id, updatedPreAlert);

    await emergencyService.update(emergencyId, {
      preAlert: updatedPreAlert,
      recommendedHospital: emergency.recommendedHospital
        ? { ...emergency.recommendedHospital, preAlertStatus: 'Acknowledged' }
        : undefined,
    });

    await activityService.logEvent(
      `Standby Confirmed: ${emergency.preAlert.hospitalName}`,
      `ED Attending acknowledged pre-alert for ${emergencyId}. Trauma bay prepared.`,
      'HOSPITAL_ALERT',
      emergencyId
    );

    return updatedPreAlert;
  }

  async recordHospitalArrival(emergencyId: string): Promise<HospitalPreAlert> {
    const emergency = await emergencyService.getById(emergencyId);
    if (!emergency || !emergency.preAlert) {
      throw new Error(`Pre-alert not found for emergency: ${emergencyId}`);
    }

    validateAlertTransition(emergency.preAlert.status, 'PATIENT_ARRIVED');

    const updatedPreAlert = serviceRecordArrival(emergency.preAlert);

    await getRepositories().alerts.update(emergency.preAlert.id, updatedPreAlert);

    await emergencyService.update(emergencyId, {
      status: 'Transporting',
      dispatchStage: 'Arrived',
      preAlert: updatedPreAlert,
    });

    const ambId = emergency.assignedAmbulance || 'Ambulance';
    const hospName = emergency.preAlert.hospitalName;

    await activityService.logEvent(
      `${ambId} arrived at ${hospName}`,
      `Emergency ${emergencyId} patient intake in progress at emergency bay.`,
      'ARRIVAL',
      emergencyId
    );

    return updatedPreAlert;
  }

  async completeHospitalHandover(
    emergencyId: string,
    notes?: string
  ): Promise<{ emergency: ActiveEmergency; ambulance?: Ambulance }> {
    const emergency = await emergencyService.getById(emergencyId);
    if (!emergency) throw new Error(`Emergency not found: ${emergencyId}`);

    let updatedPreAlert = emergency.preAlert;
    if (emergency.preAlert) {
      validateAlertTransition(emergency.preAlert.status, 'HANDOVER_COMPLETED');
      updatedPreAlert = serviceCompleteHandover(emergency.preAlert, notes);
      await getRepositories().alerts.update(emergency.preAlert.id, updatedPreAlert);
    }

    const updatedEmergency = await emergencyService.update(emergencyId, {
      status: 'Completed',
      dispatchStage: 'Completed',
      preAlert: updatedPreAlert,
      recommendedHospital: emergency.recommendedHospital
        ? { ...emergency.recommendedHospital, preAlertStatus: 'Standby Confirmed' }
        : undefined,
    });

    let updatedAmbulance: Ambulance | undefined;
    if (emergency.assignedAmbulance) {
      updatedAmbulance = await ambulanceService.updateStatus(emergency.assignedAmbulance, 'AVAILABLE', null);
    }

    const hospitalId = emergency.preAlert?.hospitalId || emergency.selectedHospitalId;
    if (hospitalId) {
      await hospitalService.adjustIncomingPatients(hospitalId, -1);
    }

    const hospName = emergency.preAlert?.hospitalName || 'Hospital';
    await activityService.logEvent(
      `Handover completed: ${emergencyId}`,
      `Patient transferred to ${hospName} team. ${emergency.assignedAmbulance || 'Ambulance'} returned to AVAILABLE status.`,
      'DISPATCH_AUTHORIZED',
      emergencyId
    );

    return { emergency: updatedEmergency, ambulance: updatedAmbulance };
  }
}

export const alertService = new AlertService();

