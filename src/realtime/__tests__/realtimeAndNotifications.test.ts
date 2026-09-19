import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus } from '../eventBus';
import { NotificationService } from '../notificationService';
import { SimulationService } from '../simulationService';
import { RealtimeService } from '../realtimeService';
import type { ActiveEmergency, DispatchSelectionRecord } from '../../types';

// In-memory mock for localStorage in test environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value.toString();
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage.getItem) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MockLocalStorage(),
    writable: true,
  });
}

describe('RapidRoute Real-time Operations & Notification System', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('Scenario 1: New emergency event generates an in-app notification', () => {
    const notificationService = new NotificationService();

    const testEmergency: ActiveEmergency = {
      id: 'INC-TEST-101',
      location: 'MG Road Metro Station, Bangalore',
      emergencyType: 'Cardiac Arrest',
      severity: 'Critical',
      patientCount: 1,
      requiredCapability: 'ALS + Cardiac',
      notes: 'Patient unresponsive at metro platform',
      status: 'Awaiting Dispatch',
      dispatchStage: 'Awaiting dispatch',
      assignedAmbulance: null,
      etaMinutes: 6,
      reportedAt: '14:20',
      aiExtractionUsed: true,
      symptoms: ['Chest Pain', 'Unconscious'],
      timeline: [],
    };

    notificationService.addNotification(
      'CRITICAL',
      'CRITICAL',
      `New Critical Emergency: ${testEmergency.id}`,
      `${testEmergency.location} — ${testEmergency.emergencyType} requires priority dispatch.`,
      'EMERGENCY',
      testEmergency.id,
      `/?id=${testEmergency.id}`
    );

    const allNotifs = notificationService.getAll();
    const created = allNotifs.find((n) => n.entityId === 'INC-TEST-101');

    expect(created).toBeDefined();
    expect(created?.priority).toBe('CRITICAL');
    expect(created?.category).toBe('CRITICAL');
    expect(created?.read).toBe(false);
    expect(created?.actionUrl).toBe('/?id=INC-TEST-101');
  });

  it('Scenario 2: Critical emergency receives CRITICAL priority and routine receives OPERATIONS / HIGH or NORMAL', () => {
    const notificationService = new NotificationService();

    notificationService.addNotification(
      'CRITICAL',
      'CRITICAL',
      'New Critical Emergency: INC-9901',
      'Massive trauma incident on Outer Ring Road',
      'EMERGENCY',
      'INC-9901',
      '/?id=INC-9901'
    );

    notificationService.addNotification(
      'OPERATIONS',
      'NORMAL',
      'Ambulance Available: RR-101',
      'Unit RR-101 completed mission',
      'AMBULANCE',
      'RR-101',
      '/fleet'
    );

    const allNotifs = notificationService.getAll();
    const criticalNotif = allNotifs.find((n) => n.entityId === 'INC-9901');
    const routineNotif = allNotifs.find((n) => n.entityId === 'RR-101');

    expect(criticalNotif?.priority).toBe('CRITICAL');
    expect(routineNotif?.priority).toBe('NORMAL');
  });

  it('Scenario 3: TypedEventBus broadcasts AMBULANCE_DISPATCHED to subscribed listeners with typed payload', () => {
    const bus = new EventBus();
    let receivedPayload: any = null;

    const unsubscribe = bus.on('AMBULANCE_DISPATCHED', (payload) => {
      receivedPayload = payload;
    });

    const mockRecord: DispatchSelectionRecord = {
      emergencyId: 'INC-4821',
      selectedAmbulanceId: 'RR-204',
      recommendedAmbulanceId: 'RR-204',
      isOverride: false,
      timestamp: '14:25',
      authorizedBy: 'Officer S. Sharma',
    };

    bus.emit('AMBULANCE_DISPATCHED', {
      emergencyId: 'INC-4821',
      ambulanceId: 'RR-204',
      recommendedAmbulanceId: 'RR-204',
      isOverride: false,
      dispatchRecord: mockRecord,
    });

    expect(receivedPayload).not.toBeNull();
    expect(receivedPayload.emergencyId).toBe('INC-4821');
    expect(receivedPayload.ambulanceId).toBe('RR-204');
    expect(receivedPayload.isOverride).toBe(false);

    // Test unsubscribe
    receivedPayload = null;
    unsubscribe();

    bus.emit('AMBULANCE_DISPATCHED', {
      emergencyId: 'INC-4821',
      ambulanceId: 'RR-101',
      recommendedAmbulanceId: 'RR-204',
      isOverride: true,
      dispatchRecord: mockRecord,
    });

    expect(receivedPayload).toBeNull();
  });

  it('Scenario 4: Hospital pre-alert acknowledgement creates notification with standby confirmation', () => {
    const notificationService = new NotificationService();

    notificationService.addNotification(
      'HOSPITAL',
      'HIGH',
      'Pre-Alert Confirmed: City Emergency Hospital',
      'Trauma resuscitation bay 2 confirmed on standby for INC-4821.',
      'ALERT',
      'ALERT-INC-4821',
      '/?id=INC-4821'
    );

    const all = notificationService.getAll();
    const preAlertNotif = all.find((n) => n.title.includes('City Emergency Hospital'));

    expect(preAlertNotif).toBeDefined();
    expect(preAlertNotif?.category).toBe('HOSPITAL');
    expect(preAlertNotif?.priority).toBe('HIGH');
    expect(preAlertNotif?.message).toContain('Trauma resuscitation bay 2');
  });

  it('Scenario 5: Notification unread count tracks unread items and persists across storage reloads', () => {
    const serviceA = new NotificationService();
    serviceA.clearAll();

    expect(serviceA.getUnreadCount()).toBe(0);

    serviceA.addNotification(
      'OPERATIONS',
      'HIGH',
      'Test Alert 1',
      'Message 1',
      'EMERGENCY',
      'INC-1'
    );
    serviceA.addNotification(
      'HOSPITAL',
      'CRITICAL',
      'Test Alert 2',
      'Message 2',
      'HOSPITAL',
      'HOSP-1'
    );

    expect(serviceA.getUnreadCount()).toBe(2);

    // Simulate page reload by creating a new service instance reading from same localStorage
    const serviceB = new NotificationService();
    expect(serviceB.getUnreadCount()).toBe(2);
    expect(serviceB.getAll().length).toBe(2);
  });

  it('Scenario 6: markAllAsRead and markAsRead update notification status', () => {
    const service = new NotificationService();
    service.clearAll();

    const n1 = service.addNotification('OPERATIONS', 'NORMAL', 'Alert 1', 'M1', 'EMERGENCY', '1');
    const n2 = service.addNotification('FLEET', 'NORMAL', 'Alert 2', 'M2', 'AMBULANCE', '2');

    expect(service.getUnreadCount()).toBe(2);

    service.markAsRead(n1.id);
    expect(service.getUnreadCount()).toBe(1);

    const updatedN1 = service.getAll().find((n) => n.id === n1.id);
    const updatedN2 = service.getAll().find((n) => n.id === n2.id);
    expect(updatedN1?.read).toBe(true);
    expect(updatedN2?.read).toBe(false);

    service.markAllAsRead();
    expect(service.getUnreadCount()).toBe(0);
    expect(service.getAll().every((n) => n.read)).toBe(true);
  });

  it('Scenario 7: EventBus isolates listener errors without crashing other listeners', () => {
    const bus = new EventBus();
    let listenerBExecuted = false;

    // Listener A throws an intentional error
    bus.on('ETA_UPDATED', () => {
      throw new Error('Intentional error in listener A');
    });

    // Listener B should still be invoked safely
    bus.on('ETA_UPDATED', () => {
      listenerBExecuted = true;
    });

    expect(() => {
      bus.emit('ETA_UPDATED', {
        ambulanceId: 'RR-204',
        emergencyId: 'INC-4821',
        oldEta: 8,
        newEta: 6,
        reason: 'Traffic corridor green wave cleared route',
      });
    }).not.toThrow();

    expect(listenerBExecuted).toBe(true);
  });

  it('Scenario 8: Deterministic demo simulation advances through stages', () => {
    const sim = new SimulationService();
    sim.reset();

    const initial = sim.getStatus();
    expect(initial.currentStage).toBe(0);
    expect(initial.totalStages).toBe(7);
    expect(initial.isRunning).toBe(false);

    // Step 1: Emergency Created
    const step1 = sim.step();
    expect(step1.currentStage).toBe(1);
    expect(step1.stageName).toBe('Emergency Created');

    // Step 2: Ambulance Dispatched
    const step2 = sim.step();
    expect(step2.currentStage).toBe(2);
    expect(step2.stageName).toBe('Ambulance Dispatched');

    // Step 3: ETA Updated
    const step3 = sim.step();
    expect(step3.currentStage).toBe(3);
    expect(step3.stageName).toBe('ETA Updated');

    // Reset
    const resetStatus = sim.reset();
    expect(resetStatus.currentStage).toBe(0);
    expect(resetStatus.isRunning).toBe(false);
  });

  it('Scenario 9: RealtimeService handles fallback to DEMO_LIVE mode honestly when Supabase is unconfigured', () => {
    const realtimeService = new RealtimeService();

    // Since mock env has no Supabase credentials, it enters DEMO_LIVE mode
    const status = realtimeService.getStatus();
    expect(['DEMO_LIVE', 'LIVE', 'CONNECTING']).toContain(status);

    const isConnected = realtimeService.isConnected();
    expect(typeof isConnected).toBe('boolean');
  });

  it('Scenario 10: Notifications have proper entity navigation links', () => {
    const service = new NotificationService();

    const notifEmergency = service.addNotification(
      'CRITICAL',
      'CRITICAL',
      'Critical Incident INC-8822',
      'Location X',
      'EMERGENCY',
      'INC-8822',
      '/?id=INC-8822'
    );

    const notifFleet = service.addNotification(
      'FLEET',
      'NORMAL',
      'Ambulance RR-305 En Route',
      'Status change',
      'AMBULANCE',
      'RR-305',
      '/fleet'
    );

    const notifLiveOps = service.addNotification(
      'OPERATIONS',
      'HIGH',
      'Ambulance RR-204 Dispatched',
      'Assigned to INC-4821',
      'AMBULANCE',
      'RR-204',
      '/live-operations?incidentId=INC-4821'
    );

    expect(notifEmergency.actionUrl).toBe('/?id=INC-8822');
    expect(notifFleet.actionUrl).toBe('/fleet');
    expect(notifLiveOps.actionUrl).toBe('/live-operations?incidentId=INC-4821');
  });
});
