import type { Ambulance, AmbulanceStatus } from '../types';
import { getRepositories } from '../repositories';
import { validateAmbulanceTransition } from './statusLifecycle';

export class AmbulanceService {
  async getAll(): Promise<Ambulance[]> {
    return getRepositories().ambulances.getAll();
  }

  async getById(id: string): Promise<Ambulance | null> {
    return getRepositories().ambulances.getById(id);
  }

  async updateStatus(
    id: string,
    newStatus: AmbulanceStatus,
    assignedIncident: string | null = null
  ): Promise<Ambulance> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Ambulance not found: ${id}`);
    }

    validateAmbulanceTransition(existing.status, newStatus);

    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    return getRepositories().ambulances.update(id, {
      status: newStatus,
      assignedIncident: assignedIncident !== undefined ? assignedIncident : existing.assignedIncident,
      lastUpdated: nowTime,
    });
  }

  async update(id: string, updates: Partial<Ambulance>): Promise<Ambulance> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Ambulance not found: ${id}`);
    }

    if (updates.status && updates.status !== existing.status) {
      validateAmbulanceTransition(existing.status, updates.status);
    }

    return getRepositories().ambulances.update(id, updates);
  }
}

export const ambulanceService = new AmbulanceService();

