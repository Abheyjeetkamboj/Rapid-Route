import type { Ambulance } from '../../types';
import type { IAmbulanceRepository, DbAmbulance } from '../types';
import { supabase } from './supabaseClient';
import { dbToAmbulance, ambulanceToDb } from '../mappers';

export class SupabaseAmbulanceRepository implements IAmbulanceRepository {
  private get client() {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }
    return supabase;
  }

  async getAll(): Promise<Ambulance[]> {
    const { data, error } = await this.client.from('ambulances').select('*').order('id', { ascending: true });
    if (error) {
      throw new Error(`Failed to fetch ambulances from Supabase: ${error.message}`);
    }
    return (data as DbAmbulance[]).map(dbToAmbulance);
  }

  async getById(id: string): Promise<Ambulance | null> {
    const { data, error } = await this.client.from('ambulances').select('*').eq('id', id).maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch ambulance ${id}: ${error.message}`);
    }
    return data ? dbToAmbulance(data as DbAmbulance) : null;
  }

  async update(id: string, updates: Partial<Ambulance>): Promise<Ambulance> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Ambulance not found: ${id}`);
    }
    const merged = { ...existing, ...updates, id };
    const dbRow = ambulanceToDb(merged);

    const { data, error } = await this.client
      .from('ambulances')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ambulance ${id}: ${error.message}`);
    }
    return dbToAmbulance(data as DbAmbulance);
  }

  async reset(): Promise<void> {}
}

