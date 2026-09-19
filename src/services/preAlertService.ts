import type {
  ActiveEmergency,
  Ambulance,
  Hospital,
  HospitalPreAlert,
} from '../types';

/**
 * Derives clinical trauma / specialty preparation instructions from incident parameters
 */
export function deriveClinicalPreparation(incident: ActiveEmergency): string {
  const type = (incident.emergencyType || '').toLowerCase();
  const notes = (incident.notes || '').toLowerCase();
  const symptoms = (incident.symptoms || []).map((s) => s.toLowerCase());

  if (
    type.includes('cardiac') ||
    type.includes('chest pain') ||
    notes.includes('cardiac') ||
    symptoms.some((s) => s.includes('chest pain'))
  ) {
    return 'Immediate Cardiac Catheterization Team & Critical Resuscitation Bay Standby';
  }

  if (
    type.includes('collision') ||
    type.includes('accident') ||
    type.includes('fall') ||
    type.includes('trauma') ||
    symptoms.some((s) => s.includes('trauma') || s.includes('unconscious'))
  ) {
    return 'Level 1 Trauma Surgical Team Standby with 4 Units O-Neg Blood Reserved';
  }

  if (type.includes('ventilator') || type.includes('icu')) {
    return 'Dedicated ICU Bed with Mechanical Ventilator Standby';
  }

  return 'Emergency Department Acute Assessment Bay Standby';
}

/**
 * Generates a structured hospital pre-alert based solely on verified incident data
 */
export function generateHospitalPreAlert(
  incident: ActiveEmergency,
  ambulance: Ambulance | { id: string; etaMinutes: number | null },
  hospital: Hospital
): HospitalPreAlert {
  const nowTime =
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

  return {
    id: `ALERT-${incident.id}-${hospital.id}`,
    incidentId: incident.id,
    severity: incident.severity,
    emergencyType: incident.emergencyType,
    patientCount: incident.patientCount,
    patientAge: incident.patientAge,
    symptoms: incident.symptoms || [incident.emergencyType],
    ambulanceId: ambulance.id,
    ambulanceEta: ambulance.etaMinutes ?? 8,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    requiredPreparation: deriveClinicalPreparation(incident),
    sentAt: nowTime,
    status: 'READY_TO_SEND',
  };
}

/**
 * Simulates hospital acknowledgement in demo environment
 */
export function simulateHospitalAcknowledgement(
  preAlert: HospitalPreAlert,
  notes?: string
): HospitalPreAlert {
  const nowTime =
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

  return {
    ...preAlert,
    status: 'ACKNOWLEDGED',
    acknowledgedAt: nowTime,
    acknowledgementNotes:
      notes || 'ED Attending confirmed preparation: Trauma bay prepped, clinical team on standby.',
  };
}

/**
 * Records ambulance arrival at the hospital emergency department
 */
export function recordHospitalArrival(preAlert: HospitalPreAlert): HospitalPreAlert {
  const nowTime =
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

  return {
    ...preAlert,
    status: 'PATIENT_ARRIVED',
    arrivedAt: nowTime,
  };
}

/**
 * Records final patient handover completion to hospital emergency staff
 */
export function completeHospitalHandover(
  preAlert: HospitalPreAlert,
  notes?: string
): HospitalPreAlert {
  const nowTime =
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

  return {
    ...preAlert,
    status: 'HANDOVER_COMPLETED',
    handoverCompletedAt: nowTime,
    acknowledgementNotes:
      notes || 'Clinical handover completed. Patient care transferred to hospital ED team.',
  };
}
