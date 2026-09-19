import type { ActiveEmergency } from '../types';
import { getRepositories } from '../repositories';
import { validateEmergencyInput } from './validationService';
import { validateEmergencyTransition } from './statusLifecycle';
import { activityService } from './activityService';

export class EmergencyService {
  async getAll(): Promise<ActiveEmergency[]> {
    return getRepositories().emergencies.getAll();
  }

  async getById(id: string): Promise<ActiveEmergency | null> {
    return getRepositories().emergencies.getById(id);
  }

  async create(emergency: ActiveEmergency): Promise<ActiveEmergency> {
    // 1. Validation
    validateEmergencyInput(emergency);

    // 2. Persist
    const created = await getRepositories().emergencies.create(emergency);

    // 3. Log activity event
    await activityService.logEvent(
      `Emergency call registered (${created.id})`,
      `${created.location} — ${created.emergencyType} [${created.severity}]`,
      'REQUEST_RECEIVED',
      created.id
    );

    return created;
  }

  async update(id: string, updates: Partial<ActiveEmergency>): Promise<ActiveEmergency> {
    const existing = await getRepositories().emergencies.getById(id);
    if (!existing) {
      throw new Error(`Emergency not found: ${id}`);
    }

    // Check status transition if status is being updated
    if (updates.status && updates.status !== existing.status) {
      validateEmergencyTransition(existing.status, updates.status);
    }

    return getRepositories().emergencies.update(id, updates);
  }

  async delete(id: string): Promise<boolean> {
    return getRepositories().emergencies.delete(id);
  }
}

export const emergencyService = new EmergencyService();

