import { eventBus } from './eventBus';
import type {
  AppNotification,
  NotificationCategory,
  NotificationPriority,
  RealtimeEventType,
} from './eventTypes';

const STORAGE_KEY = 'rapidroute_v2_notifications';

type NotificationListener = (notifications: AppNotification[]) => void;

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
          this.notifications = JSON.parse(raw);
          return;
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Error reading notifications from localStorage:', err);
    }
    // Seed initial informational notification
    this.notifications = [
      {
        id: 'notif-seed-01',
        category: 'SYSTEM',
        priority: 'NORMAL',
        title: 'EOC Operations Active',
        message: 'Real-time telemetry and decision support engine operational.',
        entityType: 'SYSTEM',
        entityId: 'SYSTEM',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ];
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

  private setupEventListeners(): void {
    eventBus.onAny((event: RealtimeEventType, payload: any) => {
      switch (event) {
        case 'EMERGENCY_CREATED': {
          const em = payload.emergency;
          if (em.severity === 'Critical') {
            this.addNotification(
              'CRITICAL',
              'CRITICAL',
              `New Critical Emergency: ${em.id}`,
              `${em.location} — ${em.emergencyType} requires priority dispatch.`,
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
            `Ambulance Dispatched: ${payload.ambulanceId}`,
            `${payload.ambulanceId} authorized for deployment to incident ${payload.emergencyId}${
              payload.isOverride ? ' [Manual Override]' : ''
            }.`,
            'AMBULANCE',
            payload.ambulanceId,
            `/live-operations?incidentId=${payload.emergencyId}`
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
              '/fleet'
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
            `Status updated from ${payload.previousStatus.toUpperCase()} to ${payload.status.toUpperCase()}. Review incoming case assignments.`,
            'HOSPITAL',
            payload.hospitalId,
            '/hospitals'
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
            'HIGH',
            `Pre-Alert Confirmed: ${payload.preAlert.hospitalName}`,
            payload.notes || `Emergency bay and surgical resuscitation team confirmed standby for ${payload.emergencyId}.`,
            'ALERT',
            payload.preAlert.id,
            `/?id=${payload.emergencyId}`
          );
          break;
        }

        case 'AMBULANCE_ARRIVED': {
          this.addNotification(
            'OPERATIONS',
            'HIGH',
            `Ambulance Arrived at Bay`,
            `Unit ${payload.ambulanceId} arrived at emergency department intake for ${payload.emergencyId}.`,
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
