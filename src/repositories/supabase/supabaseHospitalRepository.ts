import type { Hospital } from '../../types';
import type { IHospitalRepository, DbHospital } from '../types';
import { supabase } from './supabaseClient';
import { dbToHospital, hospitalToDb } from '../mappers';

export class SupabaseHospitalRepository implements IHospitalRepository {
  private get client() {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }
    return supabase;
  }

  async getAll(): Promise<Hospital[]> {
    const { data, error } = await this.client.from('hospitals').select('*').order('name', { ascending: true });
    if (error) {
      throw new Error(`Failed to fetch hospitals from Supabase: ${error.message}`);
    }
    return (data as DbHospital[]).map(dbToHospital);
  }

  async getById(id: string): Promise<Hospital | null> {
    const { data, error } = await this.client.from('hospitals').select('*').eq('id', id).maybeSingle();
    if (error) {
      throw new Error(`Failed to fetch hospital ${id}: ${error.message}`);
    }
    return data ? dbToHospital(data as DbHospital) : null;
  }

  async update(id: string, updates: Partial<Hospital>): Promise<Hospital> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Hospital not found: ${id}`);
    }
    const merged = { ...existing, ...updates, id };
    const dbRow = hospitalToDb(merged);

    const { data, error } = await this.client
      .from('hospitals')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update hospital ${id}: ${error.message}`);
    }
    return dbToHospital(data as DbHospital);
  }

  async reset(): Promise<void> {}
}

