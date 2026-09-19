import type { DispatchEvent } from '../../types';
import type { IActivityRepository, DbActivityEvent } from '../types';
import { supabase } from './supabaseClient';
import { dbToActivity, activityToDb } from '../mappers';

export class SupabaseActivityRepository implements IActivityRepository {
  private get client() {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }
    return supabase;
  }

  async getAll(): Promise<DispatchEvent[]> {
    const { data, error } = await this.client
      .from('activity_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch activity events: ${error.message}`);
    }
    return (data as DbActivityEvent[]).map(dbToActivity);
  }

  async getByEmergencyId(emergencyId: string): Promise<DispatchEvent[]> {
    const { data, error } = await this.client
      .from('activity_events')
      .select('*')
      .eq('emergency_id', emergencyId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch activity events for emergency ${emergencyId}: ${error.message}`);
    }
    return (data as DbActivityEvent[]).map(dbToActivity);
  }

  async create(event: DispatchEvent, emergencyId?: string): Promise<DispatchEvent> {
    const dbRow = activityToDb(event, emergencyId);
    const { data, error } = await this.client
      .from('activity_events')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log activity event: ${error.message}`);
    }
    return dbToActivity(data as DbActivityEvent);
  }

  async reset(): Promise<void> {}
}

