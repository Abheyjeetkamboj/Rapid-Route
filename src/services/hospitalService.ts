import type { Hospital } from '../types';
import { getRepositories } from '../repositories';

export class HospitalService {
  async getAll(): Promise<Hospital[]> {
    return getRepositories().hospitals.getAll();
  }

  async getById(id: string): Promise<Hospital | null> {
    return getRepositories().hospitals.getById(id);
  }

  async update(id: string, updates: Partial<Hospital>): Promise<Hospital> {
    return getRepositories().hospitals.update(id, updates);
  }

  async adjustIncomingPatients(id: string, delta: number): Promise<Hospital> {
    const hospital = await this.getById(id);
    if (!hospital) {
      throw new Error(`Hospital not found: ${id}`);
    }

    const current = hospital.currentIncomingPatients || hospital.incomingPatients || 0;
    const newCount = Math.max(0, current + delta);

    return this.update(id, {
      currentIncomingPatients: newCount,
      incomingPatients: newCount,
    });
  }
}

export const hospitalService = new HospitalService();

