import type { Ambulance } from '../../types';
import type { IAmbulanceRepository } from '../types';
import { SEED_AMBULANCES } from '../../data/seed/seedData';

const STORAGE_KEY = 'rapidroute_v2_ambulances';

export class LocalAmbulanceRepository implements IAmbulanceRepository {
  private load(): Ambulance[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fall back to seed
    }
    this.save(SEED_AMBULANCES);
    return SEED_AMBULANCES;
  }

  private save(items: Ambulance[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist ambulances to localStorage', e);
    }
  }

  async getAll(): Promise<Ambulance[]> {
    return this.load();
  }

  async getById(id: string): Promise<Ambulance | null> {
    const list = this.load();
    return list.find((a) => a.id === id) || null;
  }

  async update(id: string, updates: Partial<Ambulance>): Promise<Ambulance> {
    const list = this.load();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Ambulance not found: ${id}`);
    }
    const merged: Ambulance = {
      ...list[index],
      ...updates,
      id: list[index].id,
    };
    list[index] = merged;
    this.save(list);
    return merged;
  }

  async reset(): Promise<void> {
    this.save(SEED_AMBULANCES);
  }
}

