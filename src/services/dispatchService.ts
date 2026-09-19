import type {
  ActiveEmergency,
  Ambulance,
  DispatchSelectionRecord,
} from '../types';
import { getRepositories } from '../repositories';
import { ambulanceService } from './ambulanceService';
import { emergencyService } from './emergencyService';
import { hospitalService } from './hospitalService';
import { activityService } from './activityService';
import { recommendHospital } from '../engine/hospitalSelectionEngine';
import { generateHospitalPreAlert } from './preAlertService';

export interface DispatchResult {
  emergency: ActiveEmergency;
  ambulance: Ambulance;
  dispatchRecord: DispatchSelectionRecord;
}

export class DispatchService {
  async getAllDispatches(): Promise<DispatchSelectionRecord[]> {
    return getRepositories().dispatches.getAll();
  }

  async getDispatchForEmergency(emergencyId: string): Promise<DispatchSelectionRecord | null> {
    return getRepositories().dispatches.getByEmergencyId(emergencyId);
  }

  async dispatchAmbulance(
    emergencyId: string,
    selectedAmbulanceId: string,
    recommendedAmbulanceId: string,
    overrideReason?: string,
    authorizedBy: string = 'Officer S. Sharma'
  ): Promise<DispatchResult> {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    const isOverride = selectedAmbulanceId !== recommendedAmbulanceId;

    // 1. Fetch & validate emergency
    const emergency = await emergencyService.getById(emergencyId);
    if (!emergency) {
      throw new Error(`Emergency not found: ${emergencyId}`);
    }

    // 2. Fetch & update ambulance
    const ambulance = await ambulanceService.getById(selectedAmbulanceId);
    if (!ambulance) {
      throw new Error(`Ambulance not found: ${selectedAmbulanceId}`);
    }

    const updatedAmbulance = await ambulanceService.updateStatus(selectedAmbulanceId, 'EN_ROUTE', emergencyId);

    // 3. Create dispatch record
    const record: DispatchSelectionRecord = {
      emergencyId,
      recommendedAmbulanceId,
      selectedAmbulanceId,
      isOverride,
      overrideReason,
      timestamp: nowTime,
      authorizedBy,
    };
    const savedRecord = await getRepositories().dispatches.create(record);

    // 4. Determine receiving hospital / preAlert if not already present
    let preAlert = emergency.preAlert;
    let recHospital = emergency.recommendedHospital;
    let selectedHospitalId = emergency.selectedHospitalId;

    if (!preAlert) {
      const hospitals = await hospitalService.getAll();
      const hospitalRec = recommendHospital(emergency, hospitals);
      const targetHosp = hospitalRec.recommendedHospital || hospitals[0];
      if (targetHosp) {
        selectedHospitalId = targetHosp.id;
        preAlert = generateHospitalPreAlert(
          emergency,
          updatedAmbulance || { id: selectedAmbulanceId, etaMinutes: 8 },
          targetHosp
        );
        recHospital = {
          id: targetHosp.id,
          name: targetHosp.name,
          readiness: targetHosp.edStatus,
          etaMinutes: targetHosp.distanceKm ? Math.round(targetHosp.distanceKm * 1.5) : 8,
          preAlertStatus: 'Pending Dispatch',
          icuBedsAvailable: targetHosp.icuBedsAvailable,
          traumaLevel: targetHosp.traumaLevel,
        };
      }
    }

    const ambInfo = {
      id: updatedAmbulance.id,
      etaMinutes: updatedAmbulance.etaMinutes,
      capability: updatedAmbulance.capability,
      traffic: updatedAmbulance.trafficCondition || 'Light',
      currentStatus: 'EN_ROUTE',
      driverName: updatedAmbulance.driverName,
      recommendationReason: isOverride
        ? `Manual dispatcher selection (Reason: ${overrideReason || 'Operational judgment'})`
        : emergency.ambulanceDetails?.recommendationReason,
    };

    // 5. Update emergency status
    const updatedEmergency = await emergencyService.update(emergencyId, {
      status: 'Dispatched',
      dispatchStage: 'Dispatched',
      assignedAmbulance: selectedAmbulanceId,
      etaMinutes: updatedAmbulance.etaMinutes ?? emergency.etaMinutes,
      ambulanceDetails: ambInfo,
      selectedHospitalId,
      preAlert,
      recommendedHospital: recHospital,
    });

    // 6. Log activity event
    await activityService.logEvent(
      `${selectedAmbulanceId} dispatched to ${emergencyId}`,
      `${isOverride ? `[Manual Override] ` : ''}Authorized by ${authorizedBy}. Arrival ETA ~${updatedAmbulance.etaMinutes ?? 8}m.`,
      'DISPATCH_AUTHORIZED',
      emergencyId
    );

    return {
      emergency: updatedEmergency,
      ambulance: updatedAmbulance,
      dispatchRecord: savedRecord,
    };
  }
}

export const dispatchService = new DispatchService();

