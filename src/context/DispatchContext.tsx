import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type {
  ActiveEmergency,
  Ambulance,
  DispatchEvent,
  DispatchRecommendation,
  DispatchSelectionRecord,
  EmergencyDispatchInput,
  Hospital,
  HospitalPreAlert,
} from '../types';
import {
  mockActiveEmergencies,
  mockAmbulances,
  mockRecentActivity,
  mockHospitals,
} from '../data/mockData';
import { findBestAmbulance } from '../engine/dispatchEngine';
import { recommendHospital } from '../engine/hospitalSelectionEngine';
import {
  generateHospitalPreAlert,
  simulateHospitalAcknowledgement as serviceSimulateAck,
  recordHospitalArrival as serviceRecordArrival,
  completeHospitalHandover as serviceCompleteHandover,
} from '../services/preAlertService';

interface DispatchContextType {
  emergencies: ActiveEmergency[];
  ambulanceFleet: Ambulance[];
  hospitals: Hospital[];
  activityEvents: DispatchEvent[];
  dispatchHistory: DispatchSelectionRecord[];
  addEmergency: (emergency: ActiveEmergency) => void;
  runDispatchAnalysis: (emergency: EmergencyDispatchInput) => DispatchRecommendation;
  dispatchAmbulance: (
    emergencyId: string,
    ambulanceId: string,
    recommendedAmbulanceId: string,
    overrideReason?: string
  ) => void;
  confirmHospital: (emergencyId: string, hospitalId: string) => void;
  sendHospitalPreAlert: (emergencyId: string) => void;
  simulateHospitalAcknowledgement: (emergencyId: string, notes?: string) => void;
  recordHospitalArrival: (emergencyId: string) => void;
  completeHospitalHandover: (emergencyId: string, notes?: string) => void;
  resetDemoData: () => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

const LOCAL_STORAGE_PREFIX = 'rapidroute_';

export function DispatchProvider({ children }: { children: ReactNode }) {
  // Initialize state with localStorage persistence or mock data
  const [emergencies, setEmergencies] = useState<ActiveEmergency[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}emergencies`);
      return saved ? JSON.parse(saved) : mockActiveEmergencies;
    } catch {
      return mockActiveEmergencies;
    }
  });

  const [ambulanceFleet, setAmbulanceFleet] = useState<Ambulance[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}fleet`);
      return saved ? JSON.parse(saved) : mockAmbulances;
    } catch {
      return mockAmbulances;
    }
  });

  const [hospitals, setHospitals] = useState<Hospital[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}hospitals`);
      return saved ? JSON.parse(saved) : mockHospitals;
    } catch {
      return mockHospitals;
    }
  });

  const [activityEvents, setActivityEvents] = useState<DispatchEvent[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}activity`);
      return saved ? JSON.parse(saved) : mockRecentActivity;
    } catch {
      return mockRecentActivity;
    }
  });

  const [dispatchHistory, setDispatchHistory] = useState<DispatchSelectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}history`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}emergencies`, JSON.stringify(emergencies));
  }, [emergencies]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}fleet`, JSON.stringify(ambulanceFleet));
  }, [ambulanceFleet]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}hospitals`, JSON.stringify(hospitals));
  }, [hospitals]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}activity`, JSON.stringify(activityEvents));
  }, [activityEvents]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}history`, JSON.stringify(dispatchHistory));
  }, [dispatchHistory]);

  const addEmergency = (newEmergency: ActiveEmergency) => {
    setEmergencies((prev) => [newEmergency, ...prev]);

    const newActivity: DispatchEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      title: `Emergency call registered (${newEmergency.id})`,
      detail: `${newEmergency.location} — ${newEmergency.emergencyType} [${newEmergency.severity}]`,
      type: 'REQUEST_RECEIVED',
    };
    setActivityEvents((prev) => [newActivity, ...prev]);
  };

  const runDispatchAnalysis = (emergency: EmergencyDispatchInput): DispatchRecommendation => {
    return findBestAmbulance(emergency, ambulanceFleet);
  };

  const dispatchAmbulance = (
    emergencyId: string,
    ambulanceId: string,
    recommendedAmbulanceId: string,
    overrideReason?: string
  ) => {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    const isOverride = ambulanceId !== recommendedAmbulanceId;

    // 1. Record selection for future analytics
    const record: DispatchSelectionRecord = {
      emergencyId,
      recommendedAmbulanceId,
      selectedAmbulanceId: ambulanceId,
      isOverride,
      overrideReason,
      timestamp: nowTime,
      authorizedBy: 'Officer S. Sharma',
    };
    setDispatchHistory((prev) => [record, ...prev]);

    // 2. Find target ambulance details
    const chosenAmbulance = ambulanceFleet.find((a) => a.id === ambulanceId);

    // 3. Update Ambulance status in fleet (AVAILABLE -> EN_ROUTE)
    setAmbulanceFleet((prev) =>
      prev.map((amb) => {
        if (amb.id === ambulanceId) {
          return {
            ...amb,
            status: 'EN_ROUTE',
            assignedIncident: emergencyId,
            lastUpdated: nowTime,
          };
        }
        return amb;
      })
    );

    // 4. Update Emergency status (AWAITING DISPATCH -> DISPATCHED)
    setEmergencies((prev) =>
      prev.map((item) => {
        if (item.id === emergencyId) {
          const ambInfo = chosenAmbulance
            ? {
                id: chosenAmbulance.id,
                etaMinutes: chosenAmbulance.etaMinutes,
                capability: chosenAmbulance.capability,
                traffic: chosenAmbulance.trafficCondition || 'Light',
                currentStatus: 'EN_ROUTE',
                driverName: chosenAmbulance.driverName,
                recommendationReason: isOverride
                  ? `Manual dispatcher selection (Reason: ${overrideReason || 'Operational judgment'})`
                  : item.ambulanceDetails?.recommendationReason,
              }
            : item.ambulanceDetails;

          // If no preAlert exists yet, derive receiving hospital
          let preAlert = item.preAlert;
          let recHospital = item.recommendedHospital;
          let selectedHospitalId = item.selectedHospitalId;

          if (!preAlert) {
            const hospitalRec = recommendHospital(item, hospitals);
            const targetHosp = hospitalRec.recommendedHospital || hospitals[0];
            if (targetHosp) {
              selectedHospitalId = targetHosp.id;
              preAlert = generateHospitalPreAlert(
                item,
                chosenAmbulance || { id: ambulanceId, etaMinutes: 8 },
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

          return {
            ...item,
            status: 'Dispatched',
            dispatchStage: 'Dispatched',
            assignedAmbulance: ambulanceId,
            etaMinutes: chosenAmbulance?.etaMinutes ?? item.etaMinutes,
            ambulanceDetails: ambInfo,
            selectedHospitalId,
            preAlert,
            recommendedHospital: recHospital,
            timeline: [
              {
                title: 'Emergency call received',
                timestamp: item.reportedAt,
                detail: `Direct CAD caller report registered`,
                status: 'completed',
              },
              {
                title: 'Dispatch analysis completed',
                timestamp: nowTime,
                detail: `Multi-factor scoring evaluated across available regional fleet`,
                status: 'completed',
              },
              {
                title: `${recommendedAmbulanceId} recommended by decision engine`,
                timestamp: nowTime,
                detail: isOverride
                  ? `Recommended ${recommendedAmbulanceId}, but dispatcher manually assigned ${ambulanceId}`
                  : `Rank #1 based on ETA, capability, and corridor traffic score`,
                status: 'completed',
              },
              {
                title: `Dispatcher approved deployment of ${ambulanceId}`,
                timestamp: nowTime,
                detail: isOverride
                  ? `Manual override by Officer S. Sharma: ${overrideReason || 'Operational judgment'}`
                  : `Authorized deployment by Officer S. Sharma`,
                status: 'completed',
              },
              {
                title: `${ambulanceId} dispatched`,
                timestamp: nowTime,
                detail: `Telemetry route beacon transmitted to vehicle mobile data terminal`,
                status: 'completed',
              },
              {
                title: `Ambulance en route to scene`,
                timestamp: chosenAmbulance?.etaMinutes ? `ETA ~${chosenAmbulance.etaMinutes} min` : 'In transit',
                detail: `Vehicle actively navigating to scene location`,
                status: 'current',
              },
            ],
          };
        }
        return item;
      })
    );

    // 5. Append activity events
    const dispatchEvent: DispatchEvent = {
      id: `evt-${Date.now()}`,
      timestamp: nowTime.replace(' IST', ''),
      title: `${ambulanceId} dispatched to ${emergencyId}`,
      detail: `${isOverride ? `[Manual Override] ` : ''}Authorized by Officer S. Sharma. Arrival ETA ~${chosenAmbulance?.etaMinutes ?? 8}m.`,
      type: 'DISPATCH_AUTHORIZED',
    };

    setActivityEvents((prev) => [dispatchEvent, ...prev]);
  };

  const confirmHospital = (emergencyId: string, hospitalId: string) => {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    const targetHosp = hospitals.find((h) => h.id === hospitalId);
    if (!targetHosp) return;

    setEmergencies((prev) =>
      prev.map((item) => {
        if (item.id === emergencyId) {
          const assignedAmb = ambulanceFleet.find((a) => a.id === item.assignedAmbulance) || {
            id: item.assignedAmbulance || 'RR-204',
            etaMinutes: item.etaMinutes || 8,
          };
          const preAlert = generateHospitalPreAlert(item, assignedAmb, targetHosp);

          return {
            ...item,
            selectedHospitalId: hospitalId,
            hospitalConfirmedAt: nowTime,
            preAlert,
            recommendedHospital: {
              id: targetHosp.id,
              name: targetHosp.name,
              readiness: targetHosp.edStatus,
              etaMinutes: preAlert.ambulanceEta,
              preAlertStatus: 'Pending Dispatch',
              icuBedsAvailable: targetHosp.icuBedsAvailable,
              traumaLevel: targetHosp.traumaLevel,
            },
            timeline: [
              ...item.timeline,
              {
                title: `Receiving hospital confirmed: ${targetHosp.name}`,
                timestamp: nowTime,
                detail: `Dispatcher confirmed receiving destination (${targetHosp.emergencyCapability}). Ready for clinical pre-alert.`,
                status: 'completed',
              },
            ],
          };
        }
        return item;
      })
    );

    // Update hospital incoming count (+1)
    setHospitals((prev) =>
      prev.map((h) =>
        h.id === hospitalId
          ? { ...h, currentIncomingPatients: h.currentIncomingPatients + 1, incomingPatients: h.incomingPatients + 1 }
          : h
      )
    );

    const newActivity: DispatchEvent = {
      id: `evt-${Date.now()}`,
      timestamp: nowTime.replace(' IST', ''),
      title: `Hospital confirmed: ${targetHosp.name}`,
      detail: `Designated receiving center for incident ${emergencyId} (${targetHosp.traumaLevel}).`,
      type: 'HOSPITAL_ALERT',
    };
    setActivityEvents((prev) => [newActivity, ...prev]);
  };

  const sendHospitalPreAlert = (emergencyId: string) => {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    setEmergencies((prev) =>
      prev.map((item) => {
        if (item.id === emergencyId && item.preAlert) {
          const updatedPreAlert: HospitalPreAlert = {
            ...item.preAlert,
            status: 'SENT',
            sentAt: nowTime,
          };

          return {
            ...item,
            preAlert: updatedPreAlert,
            recommendedHospital: item.recommendedHospital
              ? {
                  ...item.recommendedHospital,
                  preAlertStatus: 'Transmitted',
                }
              : undefined,
            timeline: [
              ...item.timeline,
              {
                title: `Hospital pre-alert transmitted`,
                timestamp: nowTime,
                detail: `Automated HL7 clinical alert sent to ${item.preAlert.hospitalName} for trauma standby.`,
                status: 'completed',
              },
            ],
          };
        }
        return item;
      })
    );

    const target = emergencies.find((e) => e.id === emergencyId);
    if (target?.preAlert) {
      const newActivity: DispatchEvent = {
        id: `evt-${Date.now()}`,
        timestamp: nowTime.replace(' IST', ''),
        title: `HL7 Pre-Alert transmitted to ${target.preAlert.hospitalName}`,
        detail: `Incident ${emergencyId} clinical data sent. Resuscitation prep initiated.`,
        type: 'HOSPITAL_ALERT',
      };
      setActivityEvents((prev) => [newActivity, ...prev]);
    }
  };

  const simulateHospitalAcknowledgement = (emergencyId: string, notes?: string) => {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    setEmergencies((prev) =>
      prev.map((item) => {
        if (item.id === emergencyId && item.preAlert) {
          const updatedPreAlert = serviceSimulateAck(item.preAlert, notes);

          return {
            ...item,
            preAlert: updatedPreAlert,
            recommendedHospital: item.recommendedHospital
              ? {
                  ...item.recommendedHospital,
                  preAlertStatus: 'Acknowledged',
                }
              : undefined,
            timeline: [
              ...item.timeline,
              {
                title: `Pre-alert acknowledged by ${item.preAlert.hospitalName}`,
                timestamp: nowTime,
                detail: updatedPreAlert.acknowledgementNotes || 'ED team and trauma bay confirmed on standby.',
                status: 'completed',
              },
            ],
          };
        }
        return item;
      })
    );

    const target = emergencies.find((e) => e.id === emergencyId);
    if (target?.preAlert) {
      const newActivity: DispatchEvent = {
        id: `evt-${Date.now()}`,
        timestamp: nowTime.replace(' IST', ''),
        title: `Standby Confirmed: ${target.preAlert.hospitalName}`,
        detail: `ED Attending acknowledged pre-alert for ${emergencyId}. Trauma bay prepared.`,
        type: 'HOSPITAL_ALERT',
      };
      setActivityEvents((prev) => [newActivity, ...prev]);
    }
  };

  const recordHospitalArrival = (emergencyId: string) => {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    setEmergencies((prev) =>
      prev.map((item) => {
        if (item.id === emergencyId && item.preAlert) {
          const updatedPreAlert = serviceRecordArrival(item.preAlert);

          return {
            ...item,
            status: 'Transporting',
            dispatchStage: 'Arrived',
            preAlert: updatedPreAlert,
            timeline: [
              ...item.timeline,
              {
                title: `Ambulance arrived at ${item.preAlert.hospitalName}`,
                timestamp: nowTime,
                detail: `Vehicle entered emergency intake bay. Offloading patient for handover.`,
                status: 'completed',
              },
            ],
          };
        }
        return item;
      })
    );

    const target = emergencies.find((e) => e.id === emergencyId);
    const ambId = target?.assignedAmbulance || 'Ambulance';
    const hospName = target?.preAlert?.hospitalName || 'Hospital';

    const newActivity: DispatchEvent = {
      id: `evt-${Date.now()}`,
      timestamp: nowTime.replace(' IST', ''),
      title: `${ambId} arrived at ${hospName}`,
      detail: `Emergency ${emergencyId} patient intake in progress at emergency bay.`,
      type: 'ARRIVAL',
    };
    setActivityEvents((prev) => [newActivity, ...prev]);
  };

  const completeHospitalHandover = (emergencyId: string, notes?: string) => {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

    const currentEmergency = emergencies.find((e) => e.id === emergencyId);
    const assignedAmbulanceId = currentEmergency?.assignedAmbulance;
    const targetHospId = currentEmergency?.preAlert?.hospitalId || currentEmergency?.selectedHospitalId;

    // 1. Update emergency status to Completed
    setEmergencies((prev) =>
      prev.map((item) => {
        if (item.id === emergencyId) {
          const updatedPreAlert = item.preAlert
            ? serviceCompleteHandover(item.preAlert, notes)
            : undefined;

          return {
            ...item,
            status: 'Completed',
            dispatchStage: 'Completed',
            preAlert: updatedPreAlert,
            recommendedHospital: item.recommendedHospital
              ? {
                  ...item.recommendedHospital,
                  preAlertStatus: 'Standby Confirmed',
                }
              : undefined,
            timeline: [
              ...item.timeline,
              {
                title: `Clinical handover completed`,
                timestamp: nowTime,
                detail: notes || 'Patient care transferred to hospital ED team. Ambulance released to AVAILABLE.',
                status: 'completed',
              },
            ],
          };
        }
        return item;
      })
    );

    // 2. Release ambulance back to AVAILABLE in fleet
    if (assignedAmbulanceId) {
      setAmbulanceFleet((prev) =>
        prev.map((amb) => {
          if (amb.id === assignedAmbulanceId) {
            return {
              ...amb,
              status: 'AVAILABLE',
              assignedIncident: null,
              lastUpdated: nowTime,
            };
          }
          return amb;
        })
      );
    }

    // 3. Decrement incoming patient count for hospital
    if (targetHospId) {
      setHospitals((prev) =>
        prev.map((h) =>
          h.id === targetHospId
            ? {
                ...h,
                currentIncomingPatients: Math.max(0, h.currentIncomingPatients - 1),
                incomingPatients: Math.max(0, h.incomingPatients - 1),
              }
            : h
        )
      );
    }

    const hospName = currentEmergency?.preAlert?.hospitalName || 'Hospital';
    const newActivity: DispatchEvent = {
      id: `evt-${Date.now()}`,
      timestamp: nowTime.replace(' IST', ''),
      title: `Handover completed: ${emergencyId}`,
      detail: `Patient transferred to ${hospName} team. ${assignedAmbulanceId || 'Ambulance'} returned to AVAILABLE status.`,
      type: 'DISPATCH_AUTHORIZED',
    };
    setActivityEvents((prev) => [newActivity, ...prev]);
  };

  const resetDemoData = () => {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}emergencies`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}fleet`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}hospitals`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}activity`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}history`);
    setEmergencies(mockActiveEmergencies);
    setAmbulanceFleet(mockAmbulances);
    setHospitals(mockHospitals);
    setActivityEvents(mockRecentActivity);
    setDispatchHistory([]);
  };

  return (
    <DispatchContext.Provider
      value={{
        emergencies,
        ambulanceFleet,
        hospitals,
        activityEvents,
        dispatchHistory,
        addEmergency,
        runDispatchAnalysis,
        dispatchAmbulance,
        confirmHospital,
        sendHospitalPreAlert,
        simulateHospitalAcknowledgement,
        recordHospitalArrival,
        completeHospitalHandover,
        resetDemoData,
      }}
    >
      {children}
    </DispatchContext.Provider>
  );
}

export function useDispatchContext() {
  const ctx = useContext(DispatchContext);
  if (!ctx) {
    throw new Error('useDispatchContext must be used within DispatchProvider');
  }
  return ctx;
}
