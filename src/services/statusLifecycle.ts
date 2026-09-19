import type { AmbulanceStatus, PreAlertStatus } from '../types';

export class InvalidStateTransitionError extends Error {
  public entity: string;
  public fromStatus: string;
  public toStatus: string;

  constructor(entity: string, fromStatus: string, toStatus: string) {
    super(`Invalid ${entity} state transition: Cannot transition from '${fromStatus}' to '${toStatus}'`);
    this.name = 'InvalidStateTransitionError';
    this.entity = entity;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

// Allowed transitions for Emergency status (supporting both UI string & Uppercase)
export const VALID_EMERGENCY_TRANSITIONS: Record<string, string[]> = {
  'Awaiting Dispatch': ['Recommended', 'Dispatched'],
  'Recommended': ['Awaiting Dispatch', 'Dispatched'],
  'Dispatched': ['En Route', 'On Scene', 'Transporting'],
  'En Route': ['On Scene', 'Transporting', 'Completed'],
  'On Scene': ['Transporting', 'Completed'],
  'Transporting': ['Completed'],
  'Completed': [], // terminal

  // Normalized DB enums
  'NEW': ['AWAITING_DISPATCH', 'DISPATCHED'],
  'AWAITING_DISPATCH': ['DISPATCHED', 'CANCELLED'],
  'DISPATCHED': ['EN_ROUTE', 'CANCELLED'],
  'EN_ROUTE': ['ARRIVED_AT_HOSPITAL', 'ON_SCENE', 'HANDOVER_IN_PROGRESS', 'COMPLETED'],
  'ARRIVED_AT_HOSPITAL': ['HANDOVER_IN_PROGRESS', 'COMPLETED'],
  'HANDOVER_IN_PROGRESS': ['COMPLETED'],
  'COMPLETED': [],
};

export const VALID_AMBULANCE_TRANSITIONS: Record<AmbulanceStatus, AmbulanceStatus[]> = {
  AVAILABLE: ['EN_ROUTE', 'BUSY', 'OFFLINE'],
  EN_ROUTE: ['BUSY', 'AVAILABLE', 'OFFLINE'],
  BUSY: ['AVAILABLE', 'OFFLINE', 'EN_ROUTE'],
  OFFLINE: ['AVAILABLE'],
};

export const VALID_ALERT_TRANSITIONS: Record<PreAlertStatus, PreAlertStatus[]> = {
  DRAFT: ['READY_TO_SEND', 'SENT'],
  READY_TO_SEND: ['SENT'],
  SENT: ['ACKNOWLEDGED', 'PATIENT_ARRIVED'],
  ACKNOWLEDGED: ['PATIENT_ARRIVED'],
  PATIENT_ARRIVED: ['HANDOVER_COMPLETED'],
  HANDOVER_COMPLETED: [],
};

export function canTransitionEmergency(current: string, next: string): boolean {
  if (current === next) return true;
  const allowed = VALID_EMERGENCY_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export function validateEmergencyTransition(current: string, next: string): void {
  if (!canTransitionEmergency(current, next)) {
    throw new InvalidStateTransitionError('Emergency', current, next);
  }
}

export function canTransitionAmbulance(current: AmbulanceStatus, next: AmbulanceStatus): boolean {
  if (current === next) return true;
  const allowed = VALID_AMBULANCE_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export function validateAmbulanceTransition(current: AmbulanceStatus, next: AmbulanceStatus): void {
  if (!canTransitionAmbulance(current, next)) {
    throw new InvalidStateTransitionError('Ambulance', current, next);
  }
}

export function canTransitionAlert(current: PreAlertStatus, next: PreAlertStatus): boolean {
  if (current === next) return true;
  const allowed = VALID_ALERT_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export function validateAlertTransition(current: PreAlertStatus, next: PreAlertStatus): void {
  if (!canTransitionAlert(current, next)) {
    throw new InvalidStateTransitionError('HospitalPreAlert', current, next);
  }
}

