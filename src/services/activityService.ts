import type { DispatchEvent, ActiveEmergency, TimelineStep } from '../types';
import { getRepositories } from '../repositories';

export class ActivityService {
  async getAll(): Promise<DispatchEvent[]> {
    return getRepositories().activity.getAll();
  }

  async getForEmergency(emergencyId: string): Promise<DispatchEvent[]> {
    return getRepositories().activity.getByEmergencyId(emergencyId);
  }

  async logEvent(
    title: string,
    detail: string,
    type: DispatchEvent['type'],
    emergencyId?: string
  ): Promise<DispatchEvent> {
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const event: DispatchEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      title,
      detail,
      type,
    };

    return getRepositories().activity.create(event, emergencyId);
  }

  /**
   * Single Source of Truth Projection:
   * Dynamically project an emergency's timeline from stored activity events.
   */
  projectTimeline(emergency: ActiveEmergency, events: DispatchEvent[]): TimelineStep[] {
    const emergencyEvents = events.filter((e) => {
      // Matches directly or mentions the emergency ID
      return e.id.includes(emergency.id) || e.detail.includes(emergency.id) || e.title.includes(emergency.id);
    });

    if (emergencyEvents.length === 0 && (!emergency.timeline || emergency.timeline.length === 0)) {
      // Return baseline intake timeline step
      return [
        {
          title: 'Emergency call received',
          timestamp: emergency.reportedAt || 'Just now',
          detail: `CAD caller report registered for ${emergency.location}`,
          status: 'completed',
        },
      ];
    }

    if (emergencyEvents.length > 0) {
      return emergencyEvents.map((evt, idx) => {
        const isLast = idx === emergencyEvents.length - 1;
        const isCompletedIncident = emergency.status === 'Completed';

        let status: 'completed' | 'current' | 'pending' = 'completed';
        if (isLast && !isCompletedIncident) {
          status = 'current';
        }

        return {
          title: evt.title,
          timestamp: evt.timestamp,
          detail: evt.detail,
          status,
        };
      });
    }

    return emergency.timeline;
  }
}

export const activityService = new ActivityService();

