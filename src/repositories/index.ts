import type { RepositoryContainer } from './types';
import { isSupabaseConfigured, checkSupabaseConnectivity } from './supabase/supabaseClient';
import { LocalEmergencyRepository } from './local/localEmergencyRepository';
import { LocalAmbulanceRepository } from './local/localAmbulanceRepository';
import { LocalHospitalRepository } from './local/localHospitalRepository';
import { LocalDispatchRepository } from './local/localDispatchRepository';
import { LocalAlertRepository } from './local/localAlertRepository';
import { LocalActivityRepository } from './local/localActivityRepository';

import { SupabaseEmergencyRepository } from './supabase/supabaseEmergencyRepository';
import { SupabaseAmbulanceRepository } from './supabase/supabaseAmbulanceRepository';
import { SupabaseHospitalRepository } from './supabase/supabaseHospitalRepository';
import { SupabaseDispatchRepository } from './supabase/supabaseDispatchRepository';
import { SupabaseAlertRepository } from './supabase/supabaseAlertRepository';
import { SupabaseActivityRepository } from './supabase/supabaseActivityRepository';

export function createLocalRepositories(): RepositoryContainer {
  const emergencies = new LocalEmergencyRepository();
  const ambulances = new LocalAmbulanceRepository();
  const hospitals = new LocalHospitalRepository();
  const dispatches = new LocalDispatchRepository();
  const alerts = new LocalAlertRepository();
  const activity = new LocalActivityRepository();

  return {
    mode: 'DEMO',
    emergencies,
    ambulances,
    hospitals,
    dispatches,
    alerts,
    activity,
    resetAll: async () => {
      await Promise.all([
        emergencies.reset(),
        ambulances.reset(),
        hospitals.reset(),
        dispatches.reset(),
        alerts.reset(),
        activity.reset(),
      ]);
    },
  };
}

export function createSupabaseRepositories(): RepositoryContainer {
  const emergencies = new SupabaseEmergencyRepository();
  const ambulances = new SupabaseAmbulanceRepository();
  const hospitals = new SupabaseHospitalRepository();
  const dispatches = new SupabaseDispatchRepository();
  const alerts = new SupabaseAlertRepository();
  const activity = new SupabaseActivityRepository();

  return {
    mode: 'CONNECTED',
    emergencies,
    ambulances,
    hospitals,
    dispatches,
    alerts,
    activity,
    resetAll: async () => {
      // In connected mode, we can reset local demo or trigger seed
      await Promise.all([
        emergencies.reset(),
        ambulances.reset(),
        hospitals.reset(),
        dispatches.reset(),
        alerts.reset(),
        activity.reset(),
      ]);
    },
  };
}

let activeContainer: RepositoryContainer = createLocalRepositories();

export async function initializeRepositories(): Promise<RepositoryContainer> {
  if (isSupabaseConfigured()) {
    try {
      const isConnected = await checkSupabaseConnectivity();
      if (isConnected) {
        console.info('[RapidRoute] Successfully connected to Supabase PostgreSQL database.');
        activeContainer = createSupabaseRepositories();
        return activeContainer;
      } else {
        console.warn('[RapidRoute] Supabase URL/key provided but database is unreachable. Falling back to DEMO MODE.');
      }
    } catch (err) {
      console.warn('[RapidRoute] Error connecting to Supabase:', err);
    }
  } else {
    console.info('[RapidRoute] Supabase credentials not provided. Operating in DEMO MODE with LocalStorage persistence.');
  }

  activeContainer = createLocalRepositories();
  return activeContainer;
}

export function getRepositories(): RepositoryContainer {
  return activeContainer;
}

export * from './types';
export * from './mappers';

