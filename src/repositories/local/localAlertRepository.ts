import type { HospitalPreAlert } from '../../types';
import type { IAlertRepository } from '../types';
import { SEED_ALERTS } from '../../data/seed/seedData';

const STORAGE_KEY = 'rapidroute_v2_hospital_alerts';

export class LocalAlertRepository implements IAlertRepository {
  private load(): HospitalPreAlert[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fall back to seed
    }
    this.save(SEED_ALERTS);
    return SEED_ALERTS;
  }

  private save(items: HospitalPreAlert[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist hospital alerts to localStorage', e);
    }
  }

  async getAll(): Promise<HospitalPreAlert[]> {
    return this.load();
  }

  async getByEmergencyId(emergencyId: string): Promise<HospitalPreAlert | null> {
    const list = this.load();
    return list.find((a) => a.incidentId === emergencyId) || null;
  }

  async create(alert: HospitalPreAlert): Promise<HospitalPreAlert> {
    const list = this.load();
    const existingIdx = list.findIndex((a) => a.id === alert.id || a.incidentId === alert.incidentId);
    let updated: HospitalPreAlert[];
    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = alert;
    } else {
      updated = [alert, ...list];
    }
    this.save(updated);
    return alert;
  }

  async update(id: string, updates: Partial<HospitalPreAlert>): Promise<HospitalPreAlert> {
    const list = this.load();
    const index = list.findIndex((a) => a.id === id || a.incidentId === id);
    if (index === -1) {
      throw new Error(`Hospital pre-alert not found: ${id}`);
    }
    const merged: HospitalPreAlert = {
      ...list[index],
      ...updates,
      id: list[index].id,
      incidentId: list[index].incidentId,
    };
    list[index] = merged;
    this.save(list);
    return merged;
  }

  async reset(): Promise<void> {
    this.save(SEED_ALERTS);
  }
}

