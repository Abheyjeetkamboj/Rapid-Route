import type { DispatchSelectionRecord } from '../../types';
import type { IDispatchRepository, DbDispatch } from '../types';
import { supabase } from './supabaseClient';
import { dbToDispatch, dispatchToDb } from '../mappers';

export class SupabaseDispatchRepository implements IDispatchRepository {
  private get client() {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }
    return supabase;
  }

  async getAll(): Promise<DispatchSelectionRecord[]> {
    const { data, error } = await this.client
      .from('dispatches')
      .select('*')
      .order('dispatched_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch dispatches from Supabase: ${error.message}`);
    }
    return (data as DbDispatch[]).map(dbToDispatch);
  }

  async getByEmergencyId(emergencyId: string): Promise<DispatchSelectionRecord | null> {
    const { data, error } = await this.client
      .from('dispatches')
      .select('*')
      .eq('emergency_id', emergencyId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch dispatch for ${emergencyId}: ${error.message}`);
    }
    return data ? dbToDispatch(data as DbDispatch) : null;
  }

  async create(record: DispatchSelectionRecord): Promise<DispatchSelectionRecord> {
    const dbRow = dispatchToDb(record);
    const { data, error } = await this.client
      .from('dispatches')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create dispatch in Supabase: ${error.message}`);
    }
    return dbToDispatch(data as DbDispatch);
  }

  async reset(): Promise<void> {}
}

