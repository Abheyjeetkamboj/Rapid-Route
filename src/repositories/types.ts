import type {
  ActiveEmergency,
  Ambulance,
  Hospital,
  DispatchSelectionRecord,
  HospitalPreAlert,
  DispatchEvent,
} from '../types';

/* =============================================================================
   DATABASE RAW ENTITY TYPES (SNAKE_CASE FOR SUPABASE POSTGRES)
   ============================================================================= */

export interface DbEmergency {
  id: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  emergency_type: string;
  severity: string;
  patient_count: number;
  patient_age: number | null;
  symptoms: string[] | null;
  required_capability: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DbAmbulance {
  id: string;
  current_area: string;
  latitude: number;
  longitude: number;
  status: string;
  capabilities: string;
  eta_minutes: number | null;
  traffic: string | null;
  driver_name: string;
  current_incident_id: string | null;
  updated_at: string;
}

export interface DbHospital {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  emergency_status: string;
  capabilities: string[];
  trauma_level: string;
  cardiac_unit: boolean;
  icu_beds_available: number;
  icu_beds_total: number;
  emergency_beds_available: number;
  emergency_beds_total: number;
  current_incoming_patients: number;
  contact_status: string;
  updated_at: string;
}

export interface DbDispatch {
  id: string;
  emergency_id: string;
  recommended_ambulance_id: string;
  selected_ambulance_id: string;
  recommendation_score: number;
  recommended_eta: number;
  is_override: boolean;
  override_reason: string | null;
  authorized_by: string;
  dispatcher_selected_at: string;
  dispatched_at: string;
  completed_at: string | null;
}

export interface DbHospitalAlert {
  id: string;
  emergency_id: string;
  ambulance_id: string;
  hospital_id: string;
  status: string;
  payload: Record<string, any>;
  acknowledgement_notes: string | null;
  sent_at: string | null;
  acknowledged_at: string | null;
  arrived_at: string | null;
  handover_completed_at: string | null;
  created_at: string;
}

export interface DbActivityEvent {
  id: string;
  emergency_id: string | null;
  event_type: string;
  message: string;
  metadata: Record<string, any>;
  created_at: string;
}

/* =============================================================================
   REPOSITORY INTERFACES
   ============================================================================= */

export interface IEmergencyRepository {
  getAll(): Promise<ActiveEmergency[]>;
  getById(id: string): Promise<ActiveEmergency | null>;
  create(emergency: ActiveEmergency): Promise<ActiveEmergency>;
  update(id: string, updates: Partial<ActiveEmergency>): Promise<ActiveEmergency>;
  delete(id: string): Promise<boolean>;
  reset(): Promise<void>;
}

export interface IAmbulanceRepository {
  getAll(): Promise<Ambulance[]>;
  getById(id: string): Promise<Ambulance | null>;
  update(id: string, updates: Partial<Ambulance>): Promise<Ambulance>;
  reset(): Promise<void>;
}

export interface IHospitalRepository {
  getAll(): Promise<Hospital[]>;
  getById(id: string): Promise<Hospital | null>;
  update(id: string, updates: Partial<Hospital>): Promise<Hospital>;
  reset(): Promise<void>;
}

export interface IDispatchRepository {
  getAll(): Promise<DispatchSelectionRecord[]>;
  getByEmergencyId(emergencyId: string): Promise<DispatchSelectionRecord | null>;
  create(record: DispatchSelectionRecord): Promise<DispatchSelectionRecord>;
  reset(): Promise<void>;
}

export interface IAlertRepository {
  getAll(): Promise<HospitalPreAlert[]>;
  getByEmergencyId(emergencyId: string): Promise<HospitalPreAlert | null>;
  create(alert: HospitalPreAlert): Promise<HospitalPreAlert>;
  update(id: string, updates: Partial<HospitalPreAlert>): Promise<HospitalPreAlert>;
  reset(): Promise<void>;
}

export interface IActivityRepository {
  getAll(): Promise<DispatchEvent[]>;
  getByEmergencyId(emergencyId: string): Promise<DispatchEvent[]>;
  create(event: DispatchEvent, emergencyId?: string): Promise<DispatchEvent>;
  reset(): Promise<void>;
}

export interface RepositoryContainer {
  emergencies: IEmergencyRepository;
  ambulances: IAmbulanceRepository;
  hospitals: IHospitalRepository;
  dispatches: IDispatchRepository;
  alerts: IAlertRepository;
  activity: IActivityRepository;
  mode: 'DEMO' | 'CONNECTED';
  resetAll: () => Promise<void>;
}

