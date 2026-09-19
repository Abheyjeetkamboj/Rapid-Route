/* =============================================
   RAPIDROUTE AI — CORE TYPE DEFINITIONS
   ============================================= */

export type EmergencySeverity = 'Critical' | 'Urgent' | 'Routine';

export type AmbulanceStatus = 'AVAILABLE' | 'EN_ROUTE' | 'BUSY' | 'OFFLINE';

export type TrafficCondition = 'Light' | 'Moderate' | 'Heavy';

export type AmbulanceCapability = 'BLS' | 'ALS' | 'ALS + Cardiac' | 'ICU';

export type HospitalStatus = 'Ready' | 'Limited' | 'Diverting' | 'Full';

export type DispatchStage =
  | 'Awaiting dispatch'
  | 'Recommended'
  | 'Dispatched'
  | 'En route'
  | 'Arrived'
  | 'Completed';

export interface TimelineStep {
  title: string;
  timestamp?: string;
  detail: string;
  status: 'completed' | 'current' | 'pending';
}

export interface AssignedAmbulanceInfo {
  id: string;
  etaMinutes: number | null;
  capability: AmbulanceCapability | string;
  traffic: TrafficCondition | string;
  currentStatus: AmbulanceStatus | string;
  driverName?: string;
  recommendationReason?: string;
}

export interface RecommendedHospitalInfo {
  id: string;
  name: string;
  readiness: HospitalStatus | string;
  etaMinutes: number;
  preAlertStatus: 'Pending Dispatch' | 'Transmitted' | 'Acknowledged' | 'Standby Confirmed';
  icuBedsAvailable: number;
  traumaLevel: string;
}

export interface Ambulance {
  id: string;
  currentArea: string;
  status: AmbulanceStatus;
  etaMinutes: number | null;
  trafficCondition: TrafficCondition | null;
  capability: AmbulanceCapability;
  driverName: string;
  assignedIncident: string | null;
  lastUpdated: string;
  lat: number;
  lng: number;
}

export interface PatientLocation {
  address: string;
  latitude: number;
  longitude: number;
  source: 'current' | 'manual';
  confidence?: number;
  subtext?: string;
}

export interface EmergencyRequest {
  id: string;
  patientLocation: string;
  locationDetails?: PatientLocation;
  emergencyType: string;
  severity: EmergencySeverity;
  patientCount: number;
  requiredCapability: string;
  reportedAt: string;
  notes: string;
}

export interface ActiveEmergency {
  id: string;
  severity: EmergencySeverity;
  location: string;
  patientLocation?: PatientLocation;
  emergencyType: string;
  patientCount: number;
  requiredCapability: string;
  notes: string;
  status: 'Awaiting Dispatch' | 'Recommended' | 'Dispatched' | 'En Route' | 'On Scene' | 'Transporting' | 'Completed';
  dispatchStage: DispatchStage;
  assignedAmbulance: string | null;
  etaMinutes: number | null;
  reportedAt: string;
  ambulanceDetails?: AssignedAmbulanceInfo;
  recommendedHospital?: RecommendedHospitalInfo;
  timeline: TimelineStep[];
  aiExtractionUsed?: boolean;
  symptoms?: string[];
  patientAge?: number;
  aiExplanation?: string;
  preAlert?: HospitalPreAlert;
  selectedHospitalId?: string | null;
  hospitalConfirmedAt?: string;
  actualResponseMinutes?: number;
  actualArrivalMinutes?: number;
  dispatchDurationMinutes?: number;
  completedAt?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export type HospitalEmergencyStatus = 'ready' | 'limited' | 'diverting' | 'full';

export interface Hospital {
  id: string;
  name: string;
  location: GeoLocation;
  area: string;
  distanceKm: number;
  emergencyStatus: HospitalEmergencyStatus;
  edStatus: HospitalStatus;
  capabilities: string[];
  emergencyCapability: string;
  icuBedsAvailable: number;
  icuBedsTotal: number;
  emergencyBedsAvailable: number;
  emergencyBedsTotal: number;
  cardiacUnit: boolean;
  traumaLevel: string;
  currentIncomingPatients: number;
  incomingPatients: number;
  contactStatus: 'online' | 'offline';
}

export type PreAlertStatus =
  | 'DRAFT'
  | 'READY_TO_SEND'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'PATIENT_ARRIVED'
  | 'HANDOVER_COMPLETED';

export interface HospitalPreAlert {
  id: string;
  incidentId: string;
  severity: EmergencySeverity;
  emergencyType: string;
  patientCount: number;
  patientAge?: number;
  symptoms: string[];
  ambulanceId: string;
  ambulanceEta: number;
  hospitalId: string;
  hospitalName: string;
  requiredPreparation: string;
  sentAt?: string;
  acknowledgedAt?: string;
  arrivedAt?: string;
  handoverCompletedAt?: string;
  status: PreAlertStatus;
  acknowledgementNotes?: string;
}

export type DispatchEventType =
  | 'REQUEST_RECEIVED'
  | 'FLEET_UPDATE'
  | 'HOSPITAL_ALERT'
  | 'DISPATCH_AUTHORIZED'
  | 'ARRIVAL';

export interface DispatchEvent {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  type: DispatchEventType;
}

export interface KpiMetrics {
  activeEmergencies: number;
  availableAmbulances: number;
  ambulancesEnRoute: number;
  averageEtaMinutes: string;
  hospitalsReceiving: number;
}

export interface AnalyticsDataPoint {
  label: string;
  value: number;
}

export * from './dispatch';
export * from '../ai/aiTypes';

