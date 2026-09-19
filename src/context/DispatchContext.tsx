import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  ActiveEmergency,
  Ambulance,
  DispatchEvent,
  DispatchRecommendation,
  DispatchSelectionRecord,
  EmergencyDispatchInput,
  Hospital,
} from '../types';
import { findBestAmbulance } from '../engine/dispatchEngine';
import { initializeRepositories, getRepositories } from '../repositories';
import { emergencyService } from '../services/emergencyService';
import { ambulanceService } from '../services/ambulanceService';
import { hospitalService } from '../services/hospitalService';
import { dispatchService } from '../services/dispatchService';
import { alertService } from '../services/alertService';
import { activityService } from '../services/activityService';
import {
  SEED_EMERGENCIES,
  SEED_AMBULANCES,
  SEED_HOSPITALS,
  SEED_ACTIVITY_EVENTS,
} from '../data/seed/seedData';
import { eventBus } from '../realtime/eventBus';
import { realtimeService } from '../realtime/realtimeService';
import { notificationService } from '../realtime/notificationService';
import { simulationService, type SimulationStatus } from '../realtime/simulationService';
import type {
  AppNotification,
  RealtimeConnectionStatus,
  ToastAlert,
} from '../realtime/eventTypes';

export interface DispatchContextType {
  emergencies: ActiveEmergency[];
  ambulanceFleet: Ambulance[];
  hospitals: Hospital[];
  activityEvents: DispatchEvent[];
  dispatchHistory: DispatchSelectionRecord[];
  appMode: 'DEMO' | 'CONNECTED';
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refreshData: () => Promise<void>;
  addEmergency: (emergency: ActiveEmergency) => Promise<void> | void;
  runDispatchAnalysis: (emergency: EmergencyDispatchInput) => DispatchRecommendation;
  dispatchAmbulance: (
    emergencyId: string,
    ambulanceId: string,
    recommendedAmbulanceId: string,
    overrideReason?: string
  ) => Promise<void> | void;
  confirmHospital: (emergencyId: string, hospitalId: string) => Promise<void> | void;
  sendHospitalPreAlert: (emergencyId: string) => Promise<void> | void;
  simulateHospitalAcknowledgement: (emergencyId: string, notes?: string) => Promise<void> | void;
  recordHospitalArrival: (emergencyId: string) => Promise<void> | void;
  completeHospitalHandover: (emergencyId: string, notes?: string) => Promise<void> | void;
  resetDemoData: () => Promise<void> | void;

  // Real-time & Notifications
  realtimeStatus: RealtimeConnectionStatus;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  dismissNotification: (id: string) => void;
  toasts: ToastAlert[];
  dismissToast: (id: string) => void;

  // Demo Simulation Controller
  simulationStatus: SimulationStatus;
  startSimulation: (stepIntervalMs?: number) => void;
  pauseSimulation: () => void;
  stepSimulation: () => void;
  resetSimulation: () => void;
  loadCardiacScenario: () => void;
  triggerNewEmergency: () => void;
  simulateEtaUpdate: (newEta?: number, reason?: string) => void;
  simulateHospitalAck: (notes?: string) => void;
  simulateAmbulanceArrival: () => void;
  simulateHandover: (notes?: string) => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

export function DispatchProvider({ children }: { children: ReactNode }) {
  const [appMode, setAppMode] = useState<'DEMO' | 'CONNECTED'>('DEMO');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Raw domain entities from repositories
  const [rawEmergencies, setRawEmergencies] = useState<ActiveEmergency[]>(SEED_EMERGENCIES);
  const [ambulanceFleet, setAmbulanceFleet] = useState<Ambulance[]>(SEED_AMBULANCES);
  const [hospitals, setHospitals] = useState<Hospital[]>(SEED_HOSPITALS);
  const [activityEvents, setActivityEvents] = useState<DispatchEvent[]>(SEED_ACTIVITY_EVENTS);
  const [dispatchHistory, setDispatchHistory] = useState<DispatchSelectionRecord[]>([]);

  // Real-time & In-App Notifications State
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('CONNECTING');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>(simulationService.getStatus());

  const clearError = () => setError(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerToast = useCallback((
    title: string,
    message: string,
    priority: ToastAlert['priority'],
    category: ToastAlert['category'],
    actionUrl?: string
  ) => {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newToast: ToastAlert = {
      id,
      title,
      message,
      priority,
      category,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      durationMs: priority === 'CRITICAL' ? 6500 : 4500,
      actionUrl,
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 3)]); // Keep max 4 toasts simultaneously

    setTimeout(() => {
      dismissToast(id);
    }, newToast.durationMs);
  }, [dismissToast]);

  // Initial load / rehydration
  const refreshData = async () => {
    try {
      setIsLoading(true);
      const container = await initializeRepositories();
      setAppMode(container.mode);

      const [allEmergencies, allFleet, allHospitals, allActivity, allDispatches] = await Promise.all([
        emergencyService.getAll(),
        ambulanceService.getAll(),
        hospitalService.getAll(),
        activityService.getAll(),
        dispatchService.getAllDispatches(),
      ]);

      setRawEmergencies(allEmergencies);
      setAmbulanceFleet(allFleet);
      setHospitals(allHospitals);
      setActivityEvents(allActivity);
      setDispatchHistory(allDispatches);
    } catch (err: any) {
      console.error('[RapidRoute] Error loading initial state:', err);
      setError(err.message || 'Failed to load operational state');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Subscribe to Realtime Service connection state
  useEffect(() => {
    const unsubConn = realtimeService.onConnectionChange((state) => {
      setRealtimeStatus(state.status);
    });

    const unsubNotif = notificationService.onNotificationsChange((list) => {
      setNotifications(list);
    });

    const unsubSim = simulationService.onStatusChange((status) => {
      setSimulationStatus(status);
    });

    return () => {
      unsubConn();
      unsubNotif();
      unsubSim();
    };
  }, []);

  // Real-Time EventBus Subscriptions: Sync state reactively across the app
  useEffect(() => {
    const unsubs = [
      // 1. New Emergency Arrives
      eventBus.on('EMERGENCY_CREATED', ({ emergency }) => {
        setRawEmergencies((prev) => {
          if (prev.some((e) => e.id === emergency.id)) return prev;
          return [emergency, ...prev];
        });

        if (emergency.severity === 'Critical') {
          triggerToast(
            `New Critical Emergency: ${emergency.id}`,
            `${emergency.location} — ${emergency.emergencyType}`,
            'CRITICAL',
            'CRITICAL',
            '/calls'
          );
        } else {
          triggerToast(
            `Emergency Intake: ${emergency.id}`,
            `${emergency.location} — ${emergency.emergencyType}`,
            'HIGH',
            'OPERATIONS',
            '/calls'
          );
        }
      }),

      // 2. Emergency Updated
      eventBus.on('EMERGENCY_UPDATED', ({ emergency }) => {
        setRawEmergencies((prev) => prev.map((e) => (e.id === emergency.id ? emergency : e)));
      }),

      // 3. Ambulance Dispatched
      eventBus.on('AMBULANCE_DISPATCHED', ({ emergencyId, ambulanceId, isOverride }) => {
        setRawEmergencies((prev) =>
          prev.map((e) =>
            e.id === emergencyId
              ? {
                  ...e,
                  status: 'Dispatched',
                  dispatchStage: 'Dispatched',
                  assignedAmbulance: ambulanceId,
                }
              : e
          )
        );

        setAmbulanceFleet((prev) =>
          prev.map((a) =>
            a.id === ambulanceId
              ? { ...a, status: 'EN_ROUTE', assignedIncident: emergencyId }
              : a
          )
        );

        triggerToast(
          `Ambulance Dispatched: ${ambulanceId}`,
          `Assigned to incident ${emergencyId}${isOverride ? ' [Manual Override]' : ''}`,
          'HIGH',
          'OPERATIONS',
          '/live-operations'
        );
      }),

      // 4. Ambulance Status Changed
      eventBus.on('AMBULANCE_STATUS_CHANGED', ({ ambulanceId, status, assignedIncident }) => {
        setAmbulanceFleet((prev) =>
          prev.map((a) =>
            a.id === ambulanceId
              ? {
                  ...a,
                  status,
                  assignedIncident: assignedIncident !== undefined ? assignedIncident : a.assignedIncident,
                }
              : a
          )
        );
      }),

      // 5. ETA Updated
      eventBus.on('ETA_UPDATED', ({ emergencyId, ambulanceId, newEta, reason }) => {
        setRawEmergencies((prev) =>
          prev.map((e) => (e.id === emergencyId ? { ...e, etaMinutes: newEta } : e))
        );

        setAmbulanceFleet((prev) =>
          prev.map((a) => (a.id === ambulanceId ? { ...a, etaMinutes: newEta } : a))
        );

        triggerToast(
          `ETA Updated: ${ambulanceId}`,
          `Arrival at ${emergencyId} updated to ${newEta}m${reason ? ` (${reason})` : ''}`,
          newEta <= 5 ? 'HIGH' : 'NORMAL',
          'OPERATIONS',
          '/live-operations'
        );
      }),

      // 6. Hospital Status Changed
      eventBus.on('HOSPITAL_STATUS_CHANGED', ({ hospitalId, status, hospitalName }) => {
        setHospitals((prev) =>
          prev.map((h) => (h.id === hospitalId ? { ...h, emergencyStatus: status } : h))
        );

        triggerToast(
          `Hospital Alert: ${hospitalName}`,
          `Emergency intake capacity changed to ${status.toUpperCase()}`,
          status === 'diverting' || status === 'full' ? 'CRITICAL' : 'HIGH',
          'HOSPITAL',
          '/hospitals'
        );
      }),

      // 7. Hospital Pre-Alert Sent
      eventBus.on('PRE_ALERT_SENT', ({ emergencyId, preAlert }) => {
        setRawEmergencies((prev) =>
          prev.map((e) => (e.id === emergencyId ? { ...e, preAlert } : e))
        );

        triggerToast(
          `Pre-Alert Transmitted: ${preAlert.hospitalName}`,
          `Incident ${emergencyId} clinical data transmitted`,
          'HIGH',
          'HOSPITAL',
          '/calls'
        );
      }),

      // 8. Hospital Pre-Alert Acknowledged
      eventBus.on('PRE_ALERT_ACKNOWLEDGED', ({ emergencyId, preAlert, notes }) => {
        setRawEmergencies((prev) =>
          prev.map((e) => (e.id === emergencyId ? { ...e, preAlert } : e))
        );

        triggerToast(
          `Pre-Alert Confirmed: ${preAlert.hospitalName}`,
          notes || `Trauma bay on standby for incident ${emergencyId}`,
          'HIGH',
          'HOSPITAL',
          '/calls'
        );
      }),

      // 9. Ambulance Arrived at Hospital
      eventBus.on('AMBULANCE_ARRIVED', ({ emergencyId, ambulanceId, preAlert }) => {
        setRawEmergencies((prev) =>
          prev.map((e) =>
            e.id === emergencyId
              ? {
                  ...e,
                  status: 'Transporting',
                  dispatchStage: 'Arrived',
                  preAlert: preAlert || e.preAlert,
                }
              : e
          )
        );

        triggerToast(
          `Unit ${ambulanceId} Arrived at Bay`,
          `Intake in progress for ${emergencyId}`,
          'HIGH',
          'OPERATIONS',
          '/calls'
        );
      }),

      // 10. Handover Completed
      eventBus.on('HANDOVER_COMPLETED', ({ emergencyId, ambulanceId, preAlert }) => {
        setRawEmergencies((prev) =>
          prev.map((e) =>
            e.id === emergencyId
              ? {
                  ...e,
                  status: 'Completed',
                  dispatchStage: 'Completed',
                  preAlert: preAlert || e.preAlert,
                }
              : e
          )
        );

        setAmbulanceFleet((prev) =>
          prev.map((a) =>
            a.id === ambulanceId ? { ...a, status: 'AVAILABLE', assignedIncident: null } : a
          )
        );

        triggerToast(
          `Handover Completed: ${emergencyId}`,
          `Care transferred to hospital ED team. Unit ${ambulanceId} is AVAILABLE`,
          'NORMAL',
          'HOSPITAL',
          '/calls'
        );
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [triggerToast]);

  // Single source of truth: project dynamic timeline from activity_events onto each emergency
  const emergencies = useMemo(() => {
    return rawEmergencies.map((item) => ({
      ...item,
      timeline: activityService.projectTimeline(item, activityEvents),
    }));
  }, [rawEmergencies, activityEvents]);

  const addEmergency = async (newEmergency: ActiveEmergency) => {
    try {
      clearError();
      const created = await emergencyService.create(newEmergency);
      setRawEmergencies((prev) => [created, ...prev.filter((e) => e.id !== created.id)]);
      const updatedEvents = await activityService.getAll();
      setActivityEvents(updatedEvents);

      // Emit real-time event
      realtimeService.emit('EMERGENCY_CREATED', { emergency: created });
    } catch (err: any) {
      console.error('[RapidRoute] Error adding emergency:', err);
      setError(err.message);
      throw err;
    }
  };

  const runDispatchAnalysis = (emergency: EmergencyDispatchInput): DispatchRecommendation => {
    return findBestAmbulance(emergency, ambulanceFleet);
  };

  const dispatchAmbulance = async (
    emergencyId: string,
    ambulanceId: string,
    recommendedAmbulanceId: string,
    overrideReason?: string
  ) => {
    try {
      clearError();
      const result = await dispatchService.dispatchAmbulance(
        emergencyId,
        ambulanceId,
        recommendedAmbulanceId,
        overrideReason
      );

      setRawEmergencies((prev) =>
        prev.map((item) => (item.id === emergencyId ? result.emergency : item))
      );
      setAmbulanceFleet((prev) =>
        prev.map((amb) => (amb.id === ambulanceId ? result.ambulance : amb))
      );
      setDispatchHistory((prev) => [
        result.dispatchRecord,
        ...prev.filter((d) => d.emergencyId !== emergencyId),
      ]);

      const updatedEvents = await activityService.getAll();
      setActivityEvents(updatedEvents);

      // Emit real-time events
      realtimeService.emit('AMBULANCE_DISPATCHED', {
        emergencyId,
        ambulanceId,
        recommendedAmbulanceId,
        isOverride: ambulanceId !== recommendedAmbulanceId,
        dispatchRecord: result.dispatchRecord,
      });

      realtimeService.emit('AMBULANCE_STATUS_CHANGED', {
        ambulanceId,
        status: 'EN_ROUTE',
        assignedIncident: emergencyId,
      });
    } catch (err: any) {
      console.error('[RapidRoute] Error dispatching ambulance:', err);
      setError(err.message);
      throw err;
    }
  };

  const confirmHospital = async (emergencyId: string, hospitalId: string) => {
    try {
      clearError();
      const result = await alertService.confirmHospital(emergencyId, hospitalId);

      setRawEmergencies((prev) =>
        prev.map((item) => (item.id === emergencyId ? result.emergency : item))
      );
      setHospitals((prev) =>
        prev.map((h) => (h.id === hospitalId ? result.hospital : h))
      );

      const updatedEvents = await activityService.getAll();
      setActivityEvents(updatedEvents);

      realtimeService.emit('HOSPITAL_SELECTED', {
        emergencyId,
        hospitalId,
        hospitalName: result.hospital.name,
      });
    } catch (err: any) {
      console.error('[RapidRoute] Error confirming hospital:', err);
      setError(err.message);
      throw err;
    }
  };

  const sendHospitalPreAlert = async (emergencyId: string) => {
    try {
      clearError();
      const alert = await alertService.sendHospitalPreAlert(emergencyId);

      setRawEmergencies((prev) =>
        prev.map((item) => {
          if (item.id === emergencyId) {
            return {
              ...item,
              preAlert: alert,
              recommendedHospital: item.recommendedHospital
                ? { ...item.recommendedHospital, preAlertStatus: 'Transmitted' }
                : undefined,
            };
          }
          return item;
        })
      );

      const updatedEvents = await activityService.getAll();
      setActivityEvents(updatedEvents);

      realtimeService.emit('PRE_ALERT_SENT', {
        emergencyId,
        hospitalId: alert.hospitalId,
        preAlert: alert,
      });
    } catch (err: any) {
      console.error('[RapidRoute] Error transmitting hospital pre-alert:', err);
      setError(err.message);
      throw err;
    }
  };

  const simulateHospitalAcknowledgement = async (emergencyId: string, notes?: string) => {
    try {
      clearError();
      const alert = await alertService.simulateHospitalAcknowledgement(emergencyId, notes);

      setRawEmergencies((prev) =>
        prev.map((item) => {
          if (item.id === emergencyId) {
            return {
              ...item,
              preAlert: alert,
              recommendedHospital: item.recommendedHospital
                ? { ...item.recommendedHospital, preAlertStatus: 'Acknowledged' }
                : undefined,
            };
          }
          return item;
        })
      );

      const updatedEvents = await activityService.getAll();
      setActivityEvents(updatedEvents);

      realtimeService.emit('PRE_ALERT_ACKNOWLEDGED', {
        emergencyId,
        hospitalId: alert.hospitalId,
        preAlert: alert,
        notes,
      });
    } catch (err: any) {
      console.error('[RapidRoute] Error acknowledging pre-alert:', err);
      setError(err.message);
      throw err;
    }
  };

  const recordHospitalArrival = async (emergencyId: string) => {
    try {
      clearError();
      const alert = await alertService.recordHospitalArrival(emergencyId);

      setRawEmergencies((prev) =>
        prev.map((item) => {
          if (item.id === emergencyId) {
            return {
              ...item,
              status: 'Transporting',
              dispatchStage: 'Arrived',
              preAlert: alert,
            };
          }
          return item;
        })
      );

      const updatedEvents = await activityService.getAll();
      setActivityEvents(updatedEvents);

      const target = rawEmergencies.find((e) => e.id === emergencyId);
      realtimeService.emit('AMBULANCE_ARRIVED', {
        emergencyId,
        ambulanceId: target?.assignedAmbulance || 'RR-204',
        hospitalId: alert.hospitalId,
        preAlert: alert,
      });
    } catch (err: any) {
      console.error('[RapidRoute] Error recording hospital arrival:', err);
      setError(err.message);
      throw err;
    }
  };

  const completeHospitalHandover = async (emergencyId: string, notes?: string) => {
    try {
      clearError();
      const result = await alertService.completeHospitalHandover(emergencyId, notes);

      setRawEmergencies((prev) =>
        prev.map((item) => (item.id === emergencyId ? result.emergency : item))
      );

      if (result.ambulance) {
        setAmbulanceFleet((prev) =>
          prev.map((amb) => (amb.id === result.ambulance!.id ? result.ambulance! : amb))
        );
      }

      const targetHospId = result.emergency.preAlert?.hospitalId || result.emergency.selectedHospitalId;
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

      const updatedEvents = await activityService.getAll();
      setActivityEvents(updatedEvents);

      realtimeService.emit('HANDOVER_COMPLETED', {
        emergencyId,
        ambulanceId: result.emergency.assignedAmbulance || 'RR-204',
        hospitalId: targetHospId || undefined,
        preAlert: result.emergency.preAlert,
      });
    } catch (err: any) {
      console.error('[RapidRoute] Error completing handover:', err);
      setError(err.message);
      throw err;
    }
  };

  const resetDemoData = async () => {
    try {
      clearError();
      await getRepositories().resetAll();
      const [allEmergencies, allFleet, allHospitals, allActivity, allDispatches] = await Promise.all([
        emergencyService.getAll(),
        ambulanceService.getAll(),
        hospitalService.getAll(),
        activityService.getAll(),
        dispatchService.getAllDispatches(),
      ]);

      setRawEmergencies(allEmergencies);
      setAmbulanceFleet(allFleet);
      setHospitals(allHospitals);
      setActivityEvents(allActivity);
      setDispatchHistory(allDispatches);
      simulationService.reset();
    } catch (err: any) {
      console.error('[RapidRoute] Error resetting data:', err);
      setError(err.message);
    }
  };

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markNotificationAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  const dismissNotification = useCallback((id: string) => {
    notificationService.dismissNotification(id);
  }, []);

  const startSimulation = useCallback((intervalMs?: number) => {
    simulationService.start(intervalMs);
  }, []);

  const pauseSimulation = useCallback(() => {
    simulationService.pause();
  }, []);

  const stepSimulation = useCallback(() => {
    simulationService.step();
  }, []);

  const resetSimulation = useCallback(() => {
    simulationService.reset();
  }, []);

  const loadCardiacScenario = useCallback(() => {
    simulationService.loadCardiacScenario();
  }, []);

  const triggerNewEmergency = useCallback(() => {
    simulationService.triggerNewEmergency();
  }, []);

  const simulateEtaUpdate = useCallback((newEta?: number, reason?: string) => {
    simulationService.simulateEtaUpdate(newEta, reason);
  }, []);

  const simulateHospitalAck = useCallback((notes?: string) => {
    simulationService.simulateHospitalAck(notes);
  }, []);

  const simulateAmbulanceArrival = useCallback(() => {
    simulationService.simulateAmbulanceArrival();
  }, []);

  const simulateHandover = useCallback((notes?: string) => {
    simulationService.simulateHandover(notes);
  }, []);

  return (
    <DispatchContext.Provider
      value={{
        emergencies,
        ambulanceFleet,
        hospitals,
        activityEvents,
        dispatchHistory,
        appMode,
        isLoading,
        error,
        clearError,
        refreshData,
        addEmergency,
        runDispatchAnalysis,
        dispatchAmbulance,
        confirmHospital,
        sendHospitalPreAlert,
        simulateHospitalAcknowledgement,
        recordHospitalArrival,
        completeHospitalHandover,
        resetDemoData,

        // Real-Time & Notifications
        realtimeStatus,
        notifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        dismissNotification,
        toasts,
        dismissToast,

        // Demo Simulation Controller
        simulationStatus,
        startSimulation,
        pauseSimulation,
        stepSimulation,
        resetSimulation,
        loadCardiacScenario,
        triggerNewEmergency,
        simulateEtaUpdate,
        simulateHospitalAck,
        simulateAmbulanceArrival,
        simulateHandover,
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
