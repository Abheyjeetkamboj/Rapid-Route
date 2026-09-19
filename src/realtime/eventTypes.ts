import type {
  ActiveEmergency,
  Ambulance,
  Hospital,
  HospitalPreAlert,
  DispatchSelectionRecord,
} from '../types';

/* =============================================================================
   OPERATIONAL REAL-TIME EVENT TYPES
   ============================================================================= */

export type RealtimeEventType =
  | 'EMERGENCY_CREATED'
  | 'EMERGENCY_UPDATED'
  | 'AMBULANCE_DISPATCHED'
  | 'AMBULANCE_STATUS_CHANGED'
  | 'ETA_UPDATED'
  | 'HOSPITAL_SELECTED'
  | 'HOSPITAL_STATUS_CHANGED'
  | 'PRE_ALERT_SENT'
  | 'PRE_ALERT_ACKNOWLEDGED'
  | 'AMBULANCE_ARRIVED'
  | 'HANDOVER_COMPLETED'
  | 'INCIDENT_COMPLETED';

export interface RealtimeEventPayloads {
  EMERGENCY_CREATED: { emergency: ActiveEmergency };
  EMERGENCY_UPDATED: { emergency: ActiveEmergency };
  AMBULANCE_DISPATCHED: {
    emergencyId: string;
    ambulanceId: string;
    recommendedAmbulanceId: string;
    isOverride: boolean;
    dispatchRecord: DispatchSelectionRecord;
  };
  AMBULANCE_STATUS_CHANGED: {
    ambulanceId: string;
    status: Ambulance['status'];
    assignedIncident: string | null;
  };
  ETA_UPDATED: {
    emergencyId: string;
    ambulanceId: string;
    oldEta: number | null;
    newEta: number;
    reason?: string;
  };
  HOSPITAL_SELECTED: {
    emergencyId: string;
    hospitalId: string;
    hospitalName: string;
  };
  HOSPITAL_STATUS_CHANGED: {
    hospitalId: string;
    status: Hospital['emergencyStatus'];
    previousStatus: Hospital['emergencyStatus'];
    hospitalName: string;
  };
  PRE_ALERT_SENT: {
    emergencyId: string;
    hospitalId: string;
    preAlert: HospitalPreAlert;
  };
  PRE_ALERT_ACKNOWLEDGED: {
    emergencyId: string;
    hospitalId: string;
    preAlert: HospitalPreAlert;
    notes?: string;
  };
  AMBULANCE_ARRIVED: {
    emergencyId: string;
    ambulanceId: string;
    hospitalId?: string;
    preAlert?: HospitalPreAlert;
  };
  HANDOVER_COMPLETED: {
    emergencyId: string;
    ambulanceId: string;
    hospitalId?: string;
    preAlert?: HospitalPreAlert;
  };
  INCIDENT_COMPLETED: {
    emergencyId: string;
    completedAt: string;
  };
}

/* =============================================================================
   IN-APP NOTIFICATION TYPES
   ============================================================================= */

export type NotificationCategory =
  | 'CRITICAL'
  | 'OPERATIONS'
  | 'HOSPITAL'
  | 'FLEET'
  | 'SYSTEM';

export type NotificationPriority =
  | 'CRITICAL'
  | 'HIGH'
  | 'NORMAL'
  | 'LOW';

export interface AppNotification {
  id: string;
  type?: NotificationCategory;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType: 'EMERGENCY' | 'AMBULANCE' | 'HOSPITAL' | 'ALERT' | 'SYSTEM';
  entityId: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/* =============================================================================
   TOAST NOTIFICATION TYPES
   ============================================================================= */

export interface ToastAlert {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  timestamp: string;
  durationMs?: number;
  actionUrl?: string;
}

/* =============================================================================
   CONNECTION STATE
   ============================================================================= */

export type RealtimeConnectionStatus =
  | 'LIVE'
  | 'DEMO_LIVE'
  | 'CONNECTING'
  | 'RECONNECTING'
  | 'OFFLINE';

export interface RealtimeConnectionState {
  status: RealtimeConnectionStatus;
  mode: 'CONNECTED' | 'DEMO';
  lastHeartbeat?: string;
  error?: string;
}

