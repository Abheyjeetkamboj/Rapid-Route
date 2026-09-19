import type { DispatchEvent } from '../../types';
import type { IActivityRepository } from '../types';
import { SEED_ACTIVITY_EVENTS } from '../../data/seed/seedData';

const STORAGE_KEY = 'rapidroute_v2_activity_events';

interface StoredActivityEvent extends DispatchEvent {
  emergencyId?: string;
  createdAt: string;
}

export class LocalActivityRepository implements IActivityRepository {
  private load(): StoredActivityEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fall back to seed
    }
    const seeded: StoredActivityEvent[] = SEED_ACTIVITY_EVENTS.map((e, idx) => ({
      ...e,
      emergencyId: e.title.includes('INC-4821')
        ? 'INC-4821'
        : e.title.includes('INC-4820')
        ? 'INC-4820'
        : e.title.includes('INC-4819')
        ? 'INC-4819'
        : e.title.includes('INC-4817')
        ? 'INC-4817'
        : undefined,
      createdAt: new Date(Date.now() - (10 - idx) * 60000).toISOString(),
    }));
    this.save(seeded);
    return seeded;
  }

  private save(items: StoredActivityEvent[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist activity events to localStorage', e);
    }
  }

  async getAll(): Promise<DispatchEvent[]> {
    return this.load();
  }

  async getByEmergencyId(emergencyId: string): Promise<DispatchEvent[]> {
    const list = this.load();
    return list.filter(
      (e) => e.emergencyId === emergencyId || e.title.includes(emergencyId) || e.detail.includes(emergencyId)
    );
  }

  async create(event: DispatchEvent, emergencyId?: string): Promise<DispatchEvent> {
    const list = this.load();
    const stored: StoredActivityEvent = {
      ...event,
      id: event.id || `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      emergencyId,
      createdAt: new Date().toISOString(),
    };
    const updated = [stored, ...list];
    this.save(updated);
    return stored;
  }

  async reset(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    this.load();
  }
}

