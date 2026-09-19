import type {
  ActiveEmergency,
  Ambulance,
  Hospital,
  DispatchSelectionRecord,
  HospitalPreAlert,
  DispatchEvent,
  EmergencySeverity,
  AmbulanceStatus,
  TrafficCondition,
  AmbulanceCapability,
  HospitalEmergencyStatus,
  HospitalStatus,
  PreAlertStatus,
  DispatchEventType,
} from '../types';
import type {
  DbEmergency,
  DbAmbulance,
  DbHospital,
  DbDispatch,
  DbHospitalAlert,
  DbActivityEvent,
} from './types';
import { getCoordinatesForIncident } from '../map/geoData';

// -------------------------------------------------------------
// Emergency Mappers
// -------------------------------------------------------------
export function dbToEmergency(db: DbEmergency): ActiveEmergency {
  // Map database status to UI status
  let uiStatus: ActiveEmergency['status'] = 'Awaiting Dispatch';
  let dispatchStage: ActiveEmergency['dispatchStage'] = 'Awaiting dispatch';

  switch (db.status) {
    case 'NEW':
    case 'ASSESSING':
    case 'AWAITING_DISPATCH':
      uiStatus = 'Awaiting Dispatch';
      dispatchStage = 'Awaiting dispatch';
      break;
    case 'DISPATCHED':
      uiStatus = 'Dispatched';
      dispatchStage = 'Dispatched';
      break;
    case 'EN_ROUTE':
      uiStatus = 'En Route';
      dispatchStage = 'En route';
      break;
    case 'ARRIVED_AT_HOSPITAL':
    case 'HANDOVER_IN_PROGRESS':
      uiStatus = 'Transporting';
      dispatchStage = 'Arrived';
      break;
    case 'COMPLETED':
      uiStatus = 'Completed';
      dispatchStage = 'Completed';
      break;
    default:
      uiStatus = (db.status as any) || 'Awaiting Dispatch';
      dispatchStage = (db.status as any) || 'Awaiting dispatch';
  }

  return {
    id: db.id,
    location: db.location,
    emergencyType: db.emergency_type,
    severity: db.severity as EmergencySeverity,
    patientCount: db.patient_count,
    patientAge: db.patient_age ?? undefined,
    symptoms: db.symptoms || [],
    requiredCapability: db.required_capability,
    notes: db.notes || '',
    status: uiStatus,
    dispatchStage,
    assignedAmbulance: null,
    etaMinutes: null,
    reportedAt: new Date(db.created_at).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' IST',
    timeline: [], // Dynamically populated from activity_events!
  };
}

export function emergencyToDb(app: ActiveEmergency): DbEmergency {
  const coords = getCoordinatesForIncident(app);

  // Normalize status to DB enum
  let dbStatus = 'AWAITING_DISPATCH';
  if (app.status === 'Completed' || app.dispatchStage === 'Completed') {
    dbStatus = 'COMPLETED';
  } else if (app.dispatchStage === 'Arrived' || app.status === 'Transporting') {
    dbStatus = 'ARRIVED_AT_HOSPITAL';
  } else if (app.status === 'En Route' || app.dispatchStage === 'En route') {
    dbStatus = 'EN_ROUTE';
  } else if (app.status === 'Dispatched' || app.dispatchStage === 'Dispatched') {
    dbStatus = 'DISPATCHED';
  }

  return {
    id: app.id,
    location: app.location,
    latitude: coords ? coords[0] : null,
    longitude: coords ? coords[1] : null,
    emergency_type: app.emergencyType,
    severity: app.severity,
    patient_count: app.patientCount,
    patient_age: app.patientAge ?? null,
    symptoms: app.symptoms || null,
    required_capability: app.requiredCapability,
    notes: app.notes,
    status: dbStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: dbStatus === 'COMPLETED' ? new Date().toISOString() : null,
  };
}

// -------------------------------------------------------------
// Ambulance Mappers
// -------------------------------------------------------------
export function dbToAmbulance(db: DbAmbulance): Ambulance {
  return {
    id: db.id,
    currentArea: db.current_area,
    lat: db.latitude,
    lng: db.longitude,
    status: db.status as AmbulanceStatus,
    capability: db.capabilities as AmbulanceCapability,
    etaMinutes: db.eta_minutes,
    trafficCondition: (db.traffic as TrafficCondition) || null,
    driverName: db.driver_name,
    assignedIncident: db.current_incident_id,
    lastUpdated: new Date(db.updated_at).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' IST',
  };
}

export function ambulanceToDb(app: Ambulance): DbAmbulance {
  return {
    id: app.id,
    current_area: app.currentArea,
    latitude: app.lat,
    longitude: app.lng,
    status: app.status,
    capabilities: app.capability,
    eta_minutes: app.etaMinutes,
    traffic: app.trafficCondition,
    driver_name: app.driverName,
    current_incident_id: app.assignedIncident,
    updated_at: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// Hospital Mappers
// -------------------------------------------------------------
export function dbToHospital(db: DbHospital): Hospital {
  return {
    id: db.id,
    name: db.name,
    location: { lat: db.latitude, lng: db.longitude },
    area: db.area,
    distanceKm: 5.0, // Calculated dynamically relative to incidents
    emergencyStatus: db.emergency_status as HospitalEmergencyStatus,
    edStatus: (db.emergency_status === 'ready'
      ? 'Ready'
      : db.emergency_status === 'limited'
      ? 'Limited'
      : 'Diverting') as HospitalStatus,
    capabilities: db.capabilities,
    emergencyCapability: db.capabilities.join(', '),
    icuBedsAvailable: db.icu_beds_available,
    icuBedsTotal: db.icu_beds_total,
    emergencyBedsAvailable: db.emergency_beds_available,
    emergencyBedsTotal: db.emergency_beds_total,
    cardiacUnit: db.cardiac_unit,
    traumaLevel: db.trauma_level,
    currentIncomingPatients: db.current_incoming_patients,
    incomingPatients: db.current_incoming_patients,
    contactStatus: db.contact_status as 'online' | 'offline',
  };
}

export function hospitalToDb(app: Hospital): DbHospital {
  return {
    id: app.id,
    name: app.name,
    area: app.area,
    latitude: app.location.lat,
    longitude: app.location.lng,
    emergency_status: app.emergencyStatus,
    capabilities: app.capabilities,
    trauma_level: app.traumaLevel,
    cardiac_unit: app.cardiacUnit,
    icu_beds_available: app.icuBedsAvailable,
    icu_beds_total: app.icuBedsTotal,
    emergency_beds_available: app.emergencyBedsAvailable,
    emergency_beds_total: app.emergencyBedsTotal,
    current_incoming_patients: app.currentIncomingPatients,
    contact_status: app.contactStatus,
    updated_at: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// Dispatch Mappers
// -------------------------------------------------------------
export function dbToDispatch(db: DbDispatch): DispatchSelectionRecord {
  return {
    emergencyId: db.emergency_id,
    recommendedAmbulanceId: db.recommended_ambulance_id,
    selectedAmbulanceId: db.selected_ambulance_id,
    isOverride: db.is_override,
    overrideReason: db.override_reason || undefined,
    authorizedBy: db.authorized_by,
    timestamp: new Date(db.dispatched_at).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' IST',
  };
}

export function dispatchToDb(app: DispatchSelectionRecord): DbDispatch {
  return {
    id: `disp-${app.emergencyId}-${Date.now()}`,
    emergency_id: app.emergencyId,
    recommended_ambulance_id: app.recommendedAmbulanceId,
    selected_ambulance_id: app.selectedAmbulanceId,
    recommendation_score: 85,
    recommended_eta: 8,
    is_override: app.isOverride,
    override_reason: app.overrideReason || null,
    authorized_by: app.authorizedBy || 'Officer S. Sharma',
    dispatcher_selected_at: new Date().toISOString(),
    dispatched_at: new Date().toISOString(),
    completed_at: null,
  };
}

// -------------------------------------------------------------
// Hospital Alert Mappers
// -------------------------------------------------------------
export function dbToAlert(db: DbHospitalAlert): HospitalPreAlert {
  return {
    id: db.id,
    incidentId: db.emergency_id,
    ambulanceId: db.ambulance_id,
    hospitalId: db.hospital_id,
    status: db.status as PreAlertStatus,
    severity: (db.payload.severity as EmergencySeverity) || 'Critical',
    emergencyType: db.payload.emergencyType || 'Medical Emergency',
    patientCount: db.payload.patientCount || 1,
    patientAge: db.payload.patientAge,
    symptoms: db.payload.symptoms || [],
    ambulanceEta: db.payload.ambulanceEta || 8,
    hospitalName: db.payload.hospitalName || 'Designated Hospital',
    requiredPreparation: db.payload.requiredPreparation || 'Acute Resuscitation Bay Standby',
    sentAt: db.sent_at ? new Date(db.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST' : undefined,
    acknowledgedAt: db.acknowledged_at ? new Date(db.acknowledged_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST' : undefined,
    arrivedAt: db.arrived_at ? new Date(db.arrived_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST' : undefined,
    handoverCompletedAt: db.handover_completed_at ? new Date(db.handover_completed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST' : undefined,
    acknowledgementNotes: db.acknowledgement_notes || undefined,
  };
}

export function alertToDb(app: HospitalPreAlert): DbHospitalAlert {
  return {
    id: app.id,
    emergency_id: app.incidentId,
    ambulance_id: app.ambulanceId,
    hospital_id: app.hospitalId,
    status: app.status,
    payload: {
      severity: app.severity,
      emergencyType: app.emergencyType,
      patientCount: app.patientCount,
      patientAge: app.patientAge,
      symptoms: app.symptoms,
      ambulanceEta: app.ambulanceEta,
      hospitalName: app.hospitalName,
      requiredPreparation: app.requiredPreparation,
    },
    acknowledgement_notes: app.acknowledgementNotes || null,
    sent_at: app.sentAt ? new Date().toISOString() : null,
    acknowledged_at: app.acknowledgedAt ? new Date().toISOString() : null,
    arrived_at: app.arrivedAt ? new Date().toISOString() : null,
    handover_completed_at: app.handoverCompletedAt ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// Activity Event Mappers
// -------------------------------------------------------------
export function dbToActivity(db: DbActivityEvent): DispatchEvent {
  return {
    id: db.id,
    timestamp: new Date(db.created_at).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    title: db.message,
    detail: db.metadata?.detail || db.message,
    type: (db.event_type as DispatchEventType) || 'REQUEST_RECEIVED',
  };
}

export function activityToDb(app: DispatchEvent, emergencyId?: string): DbActivityEvent {
  return {
    id: app.id || `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    emergency_id: emergencyId || null,
    event_type: app.type,
    message: app.title,
    metadata: { detail: app.detail },
    created_at: new Date().toISOString(),
  };
}

