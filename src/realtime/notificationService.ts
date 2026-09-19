import { eventBus } from './eventBus';
import type {
  AppNotification,
  NotificationCategory,
  NotificationPriority,
  RealtimeEventType,
} from './eventTypes';

const STORAGE_KEY = 'rapidroute_v2_notifications';

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-demo-8841',
    category: 'CRITICAL',
    type: 'CRITICAL',
    priority: 'CRITICAL',
    title: 'Critical emergency requires attention',
    message: 'INC-8841 is awaiting dispatcher review.',
    entityType: 'EMERGENCY',
    entityId: 'INC-8841',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    actionUrl: '/?id=INC-8841',
  },
  {
    id: 'notif-demo-204',
    category: 'OPERATIONS',
    type: 'OPERATIONS',
    priority: 'HIGH',
    title: 'RR-204 dispatched',
    message: 'Ambulance assigned to Rajpura corridor incident.',
    entityType: 'AMBULANCE',
    entityId: 'RR-204',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    actionUrl: '/fleet?id=RR-204',
  },
  {
    id: 'notif-demo-hosp',
    category: 'HOSPITAL',
    type: 'HOSPITAL',
    priority: 'NORMAL',
    title: 'Pre-alert acknowledged',
    message: 'City Emergency Hospital confirmed cath lab standby.',
    entityType: 'HOSPITAL',
    entityId: 'HOSP-01',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    actionUrl: '/hospitals?id=HOSP-01',
  },
];

type NotificationListener = (notifications: AppNotification[]) => void;

/**
 * Resolves the appropriate application workspace URL based on entityType and entityId
 */
export function getNotificationTargetUrl(notif: AppNotification): string {
  if (notif.actionUrl) return notif.actionUrl;
  switch (notif.entityType) {
    case 'EMERGENCY':
      return `/?id=${encodeURIComponent(notif.entityId)}`;
    case 'AMBULANCE':
      return `/fleet?id=${encodeURIComponent(notif.entityId)}`;
    case 'HOSPITAL':
      return `/hospitals?id=${encodeURIComponent(notif.entityId)}`;
    case 'ALERT':
      return `/?id=${encodeURIComponent(notif.entityId)}`;
    default:
      return '/';
  }
}

export class NotificationService {
  private notifications: AppNotification[] = [];
  private listeners = new Set<NotificationListener>();

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.notifications = parsed;
            return;
          }
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Error reading notifications from localStorage:', err);
    }
    // Seed initial deterministic notifications
    this.notifications = [...INITIAL_NOTIFICATIONS];
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
      }
    } catch (err) {
      console.warn('[NotificationService] Error saving notifications to localStorage:', err);
    }
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const list = [...this.notifications];
    this.listeners.forEach((l) => l(list));
  }

  public onNotificationsChange(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getAll(): AppNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  public markAsRead(id: string): void {
    this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.saveToStorage();
  }

  public markAllAsRead(): void {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
    this.saveToStorage();
  }

  public dismissNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.saveToStorage();
  }

  public clearAll(): void {
    this.notifications = [];
    this.saveToStorage();
  }

  public resetToDefault(): void {
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.saveToStorage();
  }

  public addNotification(
    category: NotificationCategory,
    priority: NotificationPriority,
    title: string,
    message: string,
    entityType: AppNotification['entityType'],
    entityId: string,
    actionUrl?: string,
    metadata?: Record<string, any>
  ): AppNotification {
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category,
      type: category,
      priority,
      title,
      message,
      entityType,
      entityId,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl,
      metadata,
    };

    // Prepend and cap at max 50 recent notifications
    this.notifications = [notif, ...this.notifications.slice(0, 49)];
    this.saveToStorage();
    return notif;
  }

  /**
   * Deterministic test notification generator for verification & development
   */
  public createTestNotification(): AppNotification {
    return this.addNotification(
      'CRITICAL',
      'CRITICAL',
      'Critical emergency requires attention',
      'INC-8841 is awaiting dispatcher review.',
      'EMERGENCY',
      'INC-8841',
      '/?id=INC-8841'
    );
  }

  private setupEventListeners(): void {
    eventBus.onAny((event: RealtimeEventType, payload: any) => {
      switch (event) {
        case 'EMERGENCY_CREATED': {
          const em = payload.emergency;
          if (em.severity === 'Critical') {
            this.addNotification(
              'CRITICAL',
              'CRITICAL',
              `Critical emergency requires attention`,
              `${em.id} (${em.location}) is awaiting dispatcher review.`,
              'EMERGENCY',
              em.id,
              `/?id=${em.id}`
            );
          } else {
            this.addNotification(
              'OPERATIONS',
              'HIGH',
              `Emergency Registered: ${em.id}`,
              `${em.location} — ${em.emergencyType} [${em.severity}].`,
              'EMERGENCY',
              em.id,
              `/?id=${em.id}`
            );
          }
          break;
        }

        case 'AMBULANCE_DISPATCHED': {
          this.addNotification(
            'OPERATIONS',
            'HIGH',
            `${payload.ambulanceId} dispatched`,
            `Ambulance authorized for deployment to incident ${payload.emergencyId}${
              payload.isOverride ? ' [Manual Override]' : ''
            }.`,
            'AMBULANCE',
            payload.ambulanceId,
            `/fleet?id=${payload.ambulanceId}`
          );
          break;
        }

        case 'AMBULANCE_STATUS_CHANGED': {
          if (payload.status === 'AVAILABLE') {
            this.addNotification(
              'FLEET',
              'NORMAL',
              `Ambulance Available: ${payload.ambulanceId}`,
              `Unit ${payload.ambulanceId} completed mission and returned to ready fleet status.`,
              'AMBULANCE',
              payload.ambulanceId,
              `/fleet?id=${payload.ambulanceId}`
            );
          }
          break;
        }

        case 'ETA_UPDATED': {
          this.addNotification(
            'OPERATIONS',
            payload.newEta <= 5 ? 'HIGH' : 'NORMAL',
            `ETA Updated: ${payload.ambulanceId}`,
            `Estimated arrival at incident ${payload.emergencyId} is now ${payload.newEta} min.`,
            'AMBULANCE',
            payload.ambulanceId,
            `/live-operations?incidentId=${payload.emergencyId}`
          );
          break;
        }

        case 'HOSPITAL_STATUS_CHANGED': {
          const isCritical = payload.status === 'diverting' || payload.status === 'full';
          this.addNotification(
            'HOSPITAL',
            isCritical ? 'CRITICAL' : 'HIGH',
            `Hospital Status: ${payload.hospitalName}`,
            `Status updated from ${payload.previousStatus.toUpperCase()} to ${payload.status.toUpperCase()}.`,
            'HOSPITAL',
            payload.hospitalId,
            `/hospitals?id=${payload.hospitalId}`
          );
          break;
        }

        case 'PRE_ALERT_SENT': {
          this.addNotification(
            'HOSPITAL',
            'HIGH',
            `Pre-Alert Sent: ${payload.preAlert.hospitalName}`,
            `HL7 clinical pre-alert transmitted for incident ${payload.emergencyId}.`,
            'ALERT',
            payload.preAlert.id,
            `/?id=${payload.emergencyId}`
          );
          break;
        }

        case 'PRE_ALERT_ACKNOWLEDGED': {
          this.addNotification(
            'HOSPITAL',
            'NORMAL',
            `Pre-alert acknowledged`,
            payload.notes || `${payload.preAlert.hospitalName} confirmed cath lab & trauma team standby.`,
            'HOSPITAL',
            payload.hospitalId || 'HOSP-01',
            `/hospitals?id=${payload.hospitalId || 'HOSP-01'}`
          );
          break;
        }

        case 'AMBULANCE_ARRIVED': {
          this.addNotification(
            'OPERATIONS',
            'HIGH',
            `Ambulance Arrived at Bay`,
            `Unit ${payload.ambulanceId} arrived at intake bay for ${payload.emergencyId}.`,
            'EMERGENCY',
            payload.emergencyId,
            `/?id=${payload.emergencyId}`
          );
          break;
        }

        case 'HANDOVER_COMPLETED': {
          this.addNotification(
            'HOSPITAL',
            'NORMAL',
            `Handover Completed: ${payload.emergencyId}`,
            `Patient clinical transfer signed off. Unit ${payload.ambulanceId} released to ready status.`,
            'EMERGENCY',
            payload.emergencyId,
            `/?id=${payload.emergencyId}`
          );
          break;
        }
      }
    });
  }
}

export const notificationService = new NotificationService();
