import type { DispatchSelectionRecord } from '../../types';
import type { IDispatchRepository } from '../types';
import { SEED_DISPATCHES } from '../../data/seed/seedData';

const STORAGE_KEY = 'rapidroute_v2_dispatches';

export class LocalDispatchRepository implements IDispatchRepository {
  private load(): DispatchSelectionRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fall back to seed
    }
    this.save(SEED_DISPATCHES);
    return SEED_DISPATCHES;
  }

  private save(items: DispatchSelectionRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist dispatches to localStorage', e);
    }
  }

  async getAll(): Promise<DispatchSelectionRecord[]> {
    return this.load();
  }

  async getByEmergencyId(emergencyId: string): Promise<DispatchSelectionRecord | null> {
    const list = this.load();
    return list.find((d) => d.emergencyId === emergencyId) || null;
  }

  async create(record: DispatchSelectionRecord): Promise<DispatchSelectionRecord> {
    const list = this.load();
    const filtered = list.filter((d) => d.emergencyId !== record.emergencyId);
    const updated = [record, ...filtered];
    this.save(updated);
    return record;
  }

  async reset(): Promise<void> {
    this.save(SEED_DISPATCHES);
  }
}

