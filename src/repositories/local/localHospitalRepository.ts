import type { Hospital } from '../../types';
import type { IHospitalRepository } from '../types';
import { SEED_HOSPITALS } from '../../data/seed/seedData';

const STORAGE_KEY = 'rapidroute_v2_hospitals';

export class LocalHospitalRepository implements IHospitalRepository {
  private load(): Hospital[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fall back to seed
    }
    this.save(SEED_HOSPITALS);
    return SEED_HOSPITALS;
  }

  private save(items: Hospital[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist hospitals to localStorage', e);
    }
  }

  async getAll(): Promise<Hospital[]> {
    return this.load();
  }

  async getById(id: string): Promise<Hospital | null> {
    const list = this.load();
    return list.find((h) => h.id === id) || null;
  }

  async update(id: string, updates: Partial<Hospital>): Promise<Hospital> {
    const list = this.load();
    const index = list.findIndex((h) => h.id === id);
    if (index === -1) {
      throw new Error(`Hospital not found: ${id}`);
    }
    const merged: Hospital = {
      ...list[index],
      ...updates,
      id: list[index].id,
    };
    list[index] = merged;
    this.save(list);
    return merged;
  }

  async reset(): Promise<void> {
    this.save(SEED_HOSPITALS);
  }
}

