import type { ActiveEmergency } from '../../types';
import type { IEmergencyRepository, DbEmergency } from '../types';
import { supabase } from './supabaseClient';
import { dbToEmergency, emergencyToDb } from '../mappers';

export class SupabaseEmergencyRepository implements IEmergencyRepository {
  private get client() {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }
    return supabase;
  }

  async getAll(): Promise<ActiveEmergency[]> {
    const { data, error } = await this.client
      .from('emergencies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch emergencies from Supabase: ${error.message}`);
    }

    return (data as DbEmergency[]).map(dbToEmergency);
  }

  async getById(id: string): Promise<ActiveEmergency | null> {
    const { data, error } = await this.client
      .from('emergencies')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch emergency ${id}: ${error.message}`);
    }

    return data ? dbToEmergency(data as DbEmergency) : null;
  }

  async create(emergency: ActiveEmergency): Promise<ActiveEmergency> {
    const dbRow = emergencyToDb(emergency);
    const { data, error } = await this.client
      .from('emergencies')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert emergency into Supabase: ${error.message}`);
    }

    return dbToEmergency(data as DbEmergency);
  }

  async update(id: string, updates: Partial<ActiveEmergency>): Promise<ActiveEmergency> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Emergency not found: ${id}`);
    }

    const merged = { ...existing, ...updates, id };
    const dbRow = emergencyToDb(merged);

    const { data, error } = await this.client
      .from('emergencies')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update emergency ${id}: ${error.message}`);
    }

    return dbToEmergency(data as DbEmergency);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.client.from('emergencies').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete emergency ${id}: ${error.message}`);
    }
    return true;
  }

  async reset(): Promise<void> {
    // In database mode, reset is not automatic to prevent accidental data wipes
  }
}

