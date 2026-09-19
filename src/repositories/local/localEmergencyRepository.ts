import type { ActiveEmergency } from '../../types';
import type { IEmergencyRepository } from '../types';
import { SEED_EMERGENCIES } from '../../data/seed/seedData';

const STORAGE_KEY = 'rapidroute_v2_emergencies';

export class LocalEmergencyRepository implements IEmergencyRepository {
  private load(): ActiveEmergency[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fall back to seed
    }
    this.save(SEED_EMERGENCIES);
    return SEED_EMERGENCIES;
  }

  private save(items: ActiveEmergency[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist emergencies to localStorage', e);
    }
  }

  async getAll(): Promise<ActiveEmergency[]> {
    return this.load();
  }

  async getById(id: string): Promise<ActiveEmergency | null> {
    const list = this.load();
    return list.find((e) => e.id === id) || null;
  }

  async create(emergency: ActiveEmergency): Promise<ActiveEmergency> {
    const list = this.load();
    const existingIdx = list.findIndex((e) => e.id === emergency.id);
    let updated: ActiveEmergency[];
    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = emergency;
    } else {
      updated = [emergency, ...list];
    }
    this.save(updated);
    return emergency;
  }

  async update(id: string, updates: Partial<ActiveEmergency>): Promise<ActiveEmergency> {
    const list = this.load();
    const index = list.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Emergency not found: ${id}`);
    }
    const current = list[index];
    const merged: ActiveEmergency = {
      ...current,
      ...updates,
      id: current.id, // Immutable
    };
    list[index] = merged;
    this.save(list);
    return merged;
  }

  async delete(id: string): Promise<boolean> {
    const list = this.load();
    const filtered = list.filter((e) => e.id !== id);
    if (filtered.length === list.length) return false;
    this.save(filtered);
    return true;
  }

  async reset(): Promise<void> {
    this.save(SEED_EMERGENCIES);
  }
}

