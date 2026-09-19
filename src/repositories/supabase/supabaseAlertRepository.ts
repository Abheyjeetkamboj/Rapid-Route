import type { HospitalPreAlert } from '../../types';
import type { IAlertRepository, DbHospitalAlert } from '../types';
import { supabase } from './supabaseClient';
import { dbToAlert, alertToDb } from '../mappers';

export class SupabaseAlertRepository implements IAlertRepository {
  private get client() {
    if (!supabase) {
      throw new Error('Supabase client is not configured');
    }
    return supabase;
  }

  async getAll(): Promise<HospitalPreAlert[]> {
    const { data, error } = await this.client
      .from('hospital_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch hospital alerts: ${error.message}`);
    }
    return (data as DbHospitalAlert[]).map(dbToAlert);
  }

  async getByEmergencyId(emergencyId: string): Promise<HospitalPreAlert | null> {
    const { data, error } = await this.client
      .from('hospital_alerts')
      .select('*')
      .eq('emergency_id', emergencyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch alert for emergency ${emergencyId}: ${error.message}`);
    }
    return data ? dbToAlert(data as DbHospitalAlert) : null;
  }

  async create(alert: HospitalPreAlert): Promise<HospitalPreAlert> {
    const dbRow = alertToDb(alert);
    const { data, error } = await this.client
      .from('hospital_alerts')
      .upsert(dbRow)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create hospital alert: ${error.message}`);
    }
    return dbToAlert(data as DbHospitalAlert);
  }

  async update(id: string, updates: Partial<HospitalPreAlert>): Promise<HospitalPreAlert> {
    const { data: existing, error: fetchErr } = await this.client
      .from('hospital_alerts')
      .select('*')
      .or(`id.eq.${id},emergency_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !existing) {
      throw new Error(`Hospital alert not found: ${id}`);
    }

    const currentAlert = dbToAlert(existing as DbHospitalAlert);
    const merged = { ...currentAlert, ...updates, id: currentAlert.id, incidentId: currentAlert.incidentId };
    const dbRow = alertToDb(merged);

    const { data, error } = await this.client
      .from('hospital_alerts')
      .update(dbRow)
      .eq('id', currentAlert.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update hospital alert ${id}: ${error.message}`);
    }
    return dbToAlert(data as DbHospitalAlert);
  }

  async reset(): Promise<void> {}
}

