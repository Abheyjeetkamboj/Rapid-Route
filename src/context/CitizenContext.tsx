import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useDispatchContext } from './DispatchContext';
import type { ActiveEmergency, Ambulance, Hospital, PatientLocation, EmergencySeverity } from '../types';
import type { AppNotification } from '../realtime/eventTypes';

const ACTIVE_ID_KEY = 'rapidroute_citizen_active_incident_id';
const HISTORY_IDS_KEY = 'rapidroute_citizen_history_ids';

interface CitizenRequestPayload {
  location: PatientLocation;
  emergencyType: string;
  urgency: 'Life-threatening' | 'Serious' | 'Non-critical';
  patientCount: number;
  notes?: string;
  idOverride?: string;
}

interface CitizenContextType {
  activeIncidentId: string | null;
  activeEmergency: ActiveEmergency | null;
  assignedAmbulance: Ambulance | null;
  receivingHospital: Hospital | null;
  citizenHistory: ActiveEmergency[];
  citizenNotifications: AppNotification[];
  requestEmergency: (payload: CitizenRequestPayload) => Promise<string>;
  setActiveIncidentId: (id: string | null) => void;
  loadDemoIncident: () => void;
  clearActiveEmergency: () => void;
  updateLiveLocation: (location: PatientLocation) => void;
}

const CitizenContext = createContext<CitizenContextType | undefined>(undefined);

export const CitizenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { emergencies, ambulanceFleet, hospitals, notifications, addEmergency } = useDispatchContext();

  // Active Incident ID for this citizen
  const [activeIncidentId, setActiveIncidentIdState] = useState<string | null>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(ACTIVE_ID_KEY);
      }
    } catch {
      // Ignore
    }
    return null;
  });

  // Citizen history IDs
  const [historyIds, setHistoryIds] = useState<string[]>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(HISTORY_IDS_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Ignore
    }
    // Default demo history seeds
    return ['INC-8841', 'INC-4817'];
  });

  // Persist active ID
  const setActiveIncidentId = useCallback((id: string | null) => {
    setActiveIncidentIdState(id);
    try {
      if (typeof localStorage !== 'undefined') {
        if (id) {
          localStorage.setItem(ACTIVE_ID_KEY, id);
        } else {
          localStorage.removeItem(ACTIVE_ID_KEY);
        }
      }
    } catch (err) {
      console.warn('[CitizenContext] Failed to persist active ID:', err);
    }
  }, []);

  // Update history IDs
  const addHistoryId = useCallback((id: string) => {
    setHistoryIds((prev) => {
      const next = [id, ...prev.filter((i) => i !== id)];
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(HISTORY_IDS_KEY, JSON.stringify(next));
        }
      } catch (err) {
        console.warn('[CitizenContext] Failed to persist history IDs:', err);
      }
      return next;
    });
  }, []);

  // Resolve active emergency object from shared DispatchContext
  const activeEmergency = useMemo<ActiveEmergency | null>(() => {
    if (!activeIncidentId) return null;
    return emergencies.find((e) => e.id === activeIncidentId) || null;
  }, [activeIncidentId, emergencies]);

  // Resolve assigned ambulance
  const assignedAmbulance = useMemo<Ambulance | null>(() => {
    if (!activeEmergency || !activeEmergency.assignedAmbulance) return null;
    return ambulanceFleet.find((a) => a.id === activeEmergency.assignedAmbulance) || null;
  }, [activeEmergency, ambulanceFleet]);

  // Resolve receiving hospital
  const receivingHospital = useMemo<Hospital | null>(() => {
    if (!activeEmergency) return null;
    const hospId = activeEmergency.selectedHospitalId || activeEmergency.recommendedHospital?.id;
    if (!hospId) return null;
    return hospitals.find((h) => h.id === hospId) || null;
  }, [activeEmergency, hospitals]);

  // Citizen history emergencies
  const citizenHistory = useMemo<ActiveEmergency[]>(() => {
    return historyIds
      .map((id) => emergencies.find((e) => e.id === id))
      .filter((e): e is ActiveEmergency => Boolean(e));
  }, [historyIds, emergencies]);

  // Filtered notifications for Citizen
  const citizenNotifications = useMemo<AppNotification[]>(() => {
    return notifications.filter((n) => {
      // If notification references active incident or history
      if (n.entityType === 'EMERGENCY' && (n.entityId === activeIncidentId || historyIds.includes(n.entityId))) {
        return true;
      }
      if (assignedAmbulance && n.entityType === 'AMBULANCE' && n.entityId === assignedAmbulance.id) {
        return true;
      }
      if (receivingHospital && n.entityType === 'HOSPITAL' && n.entityId === receivingHospital.id) {
        return true;
      }
      // General service alerts
      return n.category === 'SYSTEM';
    });
  }, [notifications, activeIncidentId, historyIds, assignedAmbulance, receivingHospital]);

  // Map plain-language citizen urgency to clinical EmergencySeverity
  const urgencyToSeverity = (urgency: 'Life-threatening' | 'Serious' | 'Non-critical'): EmergencySeverity => {
    switch (urgency) {
      case 'Life-threatening':
        return 'Critical';
      case 'Serious':
        return 'Urgent';
      case 'Non-critical':
      default:
        return 'Routine';
    }
  };

  // Map emergency type and urgency to clinical required capability
  const getRequiredCapability = (urgency: string, type: string): string => {
    if (urgency === 'Life-threatening') {
      if (type.toLowerCase().includes('medical') || type.toLowerCase().includes('breathing')) {
        return 'ALS + Cardiac';
      }
      return 'ALS';
    }
    if (urgency === 'Serious') {
      return 'ALS';
    }
    return 'BLS';
  };

  // Submit emergency request
  const requestEmergency = useCallback(
    async (payload: CitizenRequestPayload): Promise<string> => {
      const generatedId = payload.idOverride || `RR-${Math.floor(1000 + Math.random() * 9000)}`;
      const severity = urgencyToSeverity(payload.urgency);
      const capability = getRequiredCapability(payload.urgency, payload.emergencyType);
      const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

      const newEmergency: ActiveEmergency = {
        id: generatedId,
        severity,
        location: payload.location.address,
        patientLocation: payload.location,
        emergencyType: payload.emergencyType,
        patientCount: payload.patientCount,
        requiredCapability: capability,
        notes: payload.notes || `${payload.emergencyType} reported by citizen via mobile portal. Urgency: ${payload.urgency}.`,
        status: 'Awaiting Dispatch',
        dispatchStage: 'Awaiting dispatch',
        assignedAmbulance: null,
        etaMinutes: null,
        reportedAt: nowTime,
        timeline: [
          {
            title: 'Request Received',
            timestamp: nowTime,
            detail: 'Emergency call logged by citizen via RapidRoute assistance portal. Dispatched to regional CAD queue.',
            status: 'completed',
          },
        ],
      };

      await addEmergency(newEmergency);
      setActiveIncidentId(generatedId);
      addHistoryId(generatedId);
      return generatedId;
    },
    [addEmergency, setActiveIncidentId, addHistoryId]
  );

  // Load demo incident (INC-8841 at Chitkara University)
  const loadDemoIncident = useCallback(() => {
    setActiveIncidentId('INC-8841');
    addHistoryId('INC-8841');
  }, [setActiveIncidentId, addHistoryId]);

  // Clear active emergency
  const clearActiveEmergency = useCallback(() => {
    setActiveIncidentId(null);
  }, [setActiveIncidentId]);

  // Update live location (when citizen shares live GPS coordinates)
  const updateLiveLocation = useCallback(
    (loc: PatientLocation) => {
      if (!activeEmergency) return;
      // In local demo mode, active emergency coordinates are updated
      activeEmergency.patientLocation = loc;
      activeEmergency.location = loc.address;
    },
    [activeEmergency]
  );

  return (
    <CitizenContext.Provider
      value={{
        activeIncidentId,
        activeEmergency,
        assignedAmbulance,
        receivingHospital,
        citizenHistory,
        citizenNotifications,
        requestEmergency,
        setActiveIncidentId,
        loadDemoIncident,
        clearActiveEmergency,
        updateLiveLocation,
      }}
    >
      {children}
    </CitizenContext.Provider>
  );
};

export function useCitizen() {
  const context = useContext(CitizenContext);
  if (!context) {
    throw new Error('useCitizen must be used within a CitizenProvider');
  }
  return context;
}
