import { describe, it, expect, beforeEach } from 'vitest';
import { notificationService, getNotificationTargetUrl } from '../realtime/notificationService';
import { eventBus } from '../realtime/eventBus';
import type { AppNotification } from '../realtime/eventTypes';

describe('RapidRoute Notifications & CSS System Stabilization Verification', () => {
  beforeEach(() => {
    notificationService.resetToDefault();
  });

  // =========================================================================
  // 1. INITIAL STATE & TEST NOTIFICATIONS
  // =========================================================================
  describe('1. Initial Notification State & Unread Counts', () => {
    it('initializes with deterministic test notifications and unread count', () => {
      const all = notificationService.getAll();
      expect(all.length).toBeGreaterThanOrEqual(3);

      const unreadCount = notificationService.getUnreadCount();
      expect(unreadCount).toBeGreaterThan(0);

      // Verify the critical test notification for INC-8841 is present
      const inc8841 = all.find((n) => n.entityId === 'INC-8841');
      expect(inc8841).toBeDefined();
      expect(inc8841?.priority).toBe('CRITICAL');
      expect(inc8841?.title).toBe('Critical emergency requires attention');
      expect(inc8841?.message).toContain('INC-8841');
      expect(inc8841?.entityType).toBe('EMERGENCY');
      expect(inc8841?.read).toBe(false);
    });

    it('creates deterministic test notifications on demand', () => {
      const initialCount = notificationService.getUnreadCount();
      const testNotif = notificationService.createTestNotification();

      expect(testNotif).toBeDefined();
      expect(testNotif.title).toBe('Critical emergency requires attention');
      expect(testNotif.entityId).toBe('INC-8841');
      expect(testNotif.read).toBe(false);

      expect(notificationService.getUnreadCount()).toBe(initialCount + 1);
    });
  });

  // =========================================================================
  // 2. READ / UNREAD STATE TRANSITIONS
  // =========================================================================
  describe('2. Read / Unread State Transitions', () => {
    it('marks an individual notification as read and updates count', () => {
      const all = notificationService.getAll();
      const firstUnread = all.find((n) => !n.read);
      expect(firstUnread).toBeDefined();

      const initialUnread = notificationService.getUnreadCount();
      notificationService.markAsRead(firstUnread!.id);

      expect(notificationService.getUnreadCount()).toBe(initialUnread - 1);
      const updated = notificationService.getAll().find((n) => n.id === firstUnread!.id);
      expect(updated?.read).toBe(true);
    });

    it('marks all notifications as read and clears unread count', () => {
      expect(notificationService.getUnreadCount()).toBeGreaterThan(0);

      notificationService.markAllAsRead();
      expect(notificationService.getUnreadCount()).toBe(0);

      const all = notificationService.getAll();
      expect(all.every((n) => n.read)).toBe(true);
    });

    it('dismisses individual notification from list', () => {
      const all = notificationService.getAll();
      const first = all[0];
      const initialLength = all.length;

      notificationService.dismissNotification(first.id);
      const updated = notificationService.getAll();
      expect(updated.length).toBe(initialLength - 1);
      expect(updated.find((n) => n.id === first.id)).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. ENTITY NAVIGATION TARGET RESOLVER
  // =========================================================================
  describe('3. Entity Navigation URL Routing', () => {
    it('resolves EMERGENCY entityType to Emergency Calls page with incident query id', () => {
      const emergencyNotif: AppNotification = {
        id: 'test-em',
        category: 'CRITICAL',
        priority: 'CRITICAL',
        title: 'Cardiac call',
        message: 'Awaiting dispatch',
        entityType: 'EMERGENCY',
        entityId: 'INC-8841',
        read: false,
        createdAt: new Date().toISOString(),
      };

      const url = getNotificationTargetUrl(emergencyNotif);
      expect(url).toBe('/?id=INC-8841');
    });

    it('resolves AMBULANCE entityType to Fleet page with ambulance query id', () => {
      const ambulanceNotif: AppNotification = {
        id: 'test-amb',
        category: 'OPERATIONS',
        priority: 'HIGH',
        title: 'RR-204 dispatched',
        message: 'En route to scene',
        entityType: 'AMBULANCE',
        entityId: 'RR-204',
        read: false,
        createdAt: new Date().toISOString(),
      };

      const url = getNotificationTargetUrl(ambulanceNotif);
      expect(url).toBe('/fleet?id=RR-204');
    });

    it('resolves HOSPITAL entityType to Hospitals directory with hospital query id', () => {
      const hospNotif: AppNotification = {
        id: 'test-hosp',
        category: 'HOSPITAL',
        priority: 'NORMAL',
        title: 'Pre-alert acknowledged',
        message: 'Cath lab ready',
        entityType: 'HOSPITAL',
        entityId: 'HOSP-01',
        read: false,
        createdAt: new Date().toISOString(),
      };

      const url = getNotificationTargetUrl(hospNotif);
      expect(url).toBe('/hospitals?id=HOSP-01');
    });
  });

  // =========================================================================
  // 4. REALTIME EVENT INTEGRATION
  // =========================================================================
  describe('4. Realtime Event Ingestion into Notifications', () => {
    it('creates notification when EMERGENCY_CREATED event is emitted', () => {
      const prevCount = notificationService.getAll().length;

      eventBus.emit('EMERGENCY_CREATED', {
        emergency: {
          id: 'INC-TEST-999',
          severity: 'Critical',
          location: 'Sector 17, Chandigarh',
          emergencyType: 'Multi-Vehicle Collision',
          patientCount: 3,
          requiredCapability: 'ALS',
          status: 'Awaiting Dispatch',
          dispatchStage: 'Awaiting dispatch',
          assignedAmbulance: null,
          etaMinutes: 10,
          reportedAt: '12:00',
          timeline: [],
          notes: 'Multiple injuries reported',
        },
      });

      const all = notificationService.getAll();
      expect(all.length).toBe(prevCount + 1);

      const latest = all[0];
      expect(latest.entityId).toBe('INC-TEST-999');
      expect(latest.category).toBe('CRITICAL');
      expect(latest.read).toBe(false);
    });

    it('creates notification when AMBULANCE_DISPATCHED event is emitted', () => {
      const prevCount = notificationService.getAll().length;

      eventBus.emit('AMBULANCE_DISPATCHED', {
        emergencyId: 'INC-8841',
        ambulanceId: 'RR-204',
        recommendedAmbulanceId: 'RR-204',
        isOverride: false,
        dispatchRecord: {
          emergencyId: 'INC-8841',
          recommendedAmbulanceId: 'RR-204',
          selectedAmbulanceId: 'RR-204',
          isOverride: false,
          timestamp: '12:05',
          authorizedBy: 'Officer S. Sharma',
        },
      });

      const all = notificationService.getAll();
      expect(all.length).toBe(prevCount + 1);
      expect(all[0].entityId).toBe('RR-204');
      expect(all[0].category).toBe('OPERATIONS');
    });
  });
});
