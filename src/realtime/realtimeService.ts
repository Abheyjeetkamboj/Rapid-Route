import { supabase, isSupabaseConfigured } from '../repositories/supabase/supabaseClient';
import { eventBus } from './eventBus';
import type {
  RealtimeConnectionState,
  RealtimeConnectionStatus,
  RealtimeEventPayloads,
} from './eventTypes';
import { dbToEmergency, dbToAmbulance, dbToHospital, dbToAlert } from '../repositories/mappers';
import type { DbEmergency, DbAmbulance, DbHospital, DbHospitalAlert } from '../repositories/types';

type ConnectionStateListener = (state: RealtimeConnectionState) => void;

export class RealtimeService {
  private status: RealtimeConnectionStatus = 'CONNECTING';
  private mode: 'CONNECTED' | 'DEMO' = 'DEMO';
  private channel: any = null;
  private retryCount = 0;
  private maxRetries = 5;
  private retryTimeout: any = null;
  private listeners = new Set<ConnectionStateListener>();

  constructor() {
    this.init();
  }

  public getConnectionState(): RealtimeConnectionState {
    return {
      status: this.status,
      mode: this.mode,
      lastHeartbeat: new Date().toISOString(),
    };
  }

  public getStatus(): RealtimeConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === 'LIVE' || this.status === 'DEMO_LIVE';
  }

  public onConnectionChange(listener: ConnectionStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getConnectionState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(newStatus: RealtimeConnectionStatus, error?: string): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      const state: RealtimeConnectionState = {
        status: newStatus,
        mode: this.mode,
        lastHeartbeat: new Date().toISOString(),
        error,
      };
      this.listeners.forEach((l) => l(state));
    }
  }

  public async init(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      this.mode = 'CONNECTED';
      this.setStatus('CONNECTING');
      this.connectSupabaseRealtime();
    } else {
      this.mode = 'DEMO';
      this.setStatus('DEMO_LIVE');
      console.info('[RapidRoute Realtime] Operating in DEMO LIVE MODE with reactive EventBus.');
    }
  }

  /**
   * Subscribes to Supabase PostgreSQL Realtime channels
   */
  private connectSupabaseRealtime(): void {
    if (!supabase) {
      this.setStatus('DEMO_LIVE');
      return;
    }

    try {
      this.cleanup();

      this.channel = supabase
        .channel('rapidroute_eoc_realtime')
        // 1. Emergencies Table
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'emergencies' },
          (payload) => {
            try {
              const emergency = dbToEmergency(payload.new as DbEmergency);
              eventBus.emit('EMERGENCY_CREATED', { emergency });
            } catch (err) {
              console.error('[Realtime] Error processing emergency insert:', err);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'emergencies' },
          (payload) => {
            try {
              const emergency = dbToEmergency(payload.new as DbEmergency);
              eventBus.emit('EMERGENCY_UPDATED', { emergency });
            } catch (err) {
              console.error('[Realtime] Error processing emergency update:', err);
            }
          }
        )
        // 2. Ambulances Table
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'ambulances' },
          (payload) => {
            try {
              const amb = dbToAmbulance(payload.new as DbAmbulance);
              eventBus.emit('AMBULANCE_STATUS_CHANGED', {
                ambulanceId: amb.id,
                status: amb.status,
                assignedIncident: amb.assignedIncident,
              });
            } catch (err) {
              console.error('[Realtime] Error processing ambulance update:', err);
            }
          }
        )
        // 3. Hospitals Table
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'hospitals' },
          (payload) => {
            try {
              const prev = dbToHospital(payload.old as DbHospital);
              const next = dbToHospital(payload.new as DbHospital);
              if (prev.emergencyStatus !== next.emergencyStatus) {
                eventBus.emit('HOSPITAL_STATUS_CHANGED', {
                  hospitalId: next.id,
                  status: next.emergencyStatus,
                  previousStatus: prev.emergencyStatus,
                  hospitalName: next.name,
                });
              }
            } catch (err) {
              console.error('[Realtime] Error processing hospital update:', err);
            }
          }
        )
        // 4. Hospital Alerts Table
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hospital_alerts' },
          (payload) => {
            try {
              const alert = dbToAlert(payload.new as DbHospitalAlert);
              if (alert.status === 'SENT') {
                eventBus.emit('PRE_ALERT_SENT', {
                  emergencyId: alert.incidentId,
                  hospitalId: alert.hospitalId,
                  preAlert: alert,
                });
              } else if (alert.status === 'ACKNOWLEDGED') {
                eventBus.emit('PRE_ALERT_ACKNOWLEDGED', {
                  emergencyId: alert.incidentId,
                  hospitalId: alert.hospitalId,
                  preAlert: alert,
                  notes: alert.acknowledgementNotes,
                });
              } else if (alert.status === 'PATIENT_ARRIVED') {
                eventBus.emit('AMBULANCE_ARRIVED', {
                  emergencyId: alert.incidentId,
                  ambulanceId: alert.ambulanceId,
                  hospitalId: alert.hospitalId,
                  preAlert: alert,
                });
              } else if (alert.status === 'HANDOVER_COMPLETED') {
                eventBus.emit('HANDOVER_COMPLETED', {
                  emergencyId: alert.incidentId,
                  ambulanceId: alert.ambulanceId,
                  hospitalId: alert.hospitalId,
                  preAlert: alert,
                });
              }
            } catch (err) {
              console.error('[Realtime] Error processing hospital alert event:', err);
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            this.retryCount = 0;
            this.setStatus('LIVE');
            console.info('[RapidRoute Realtime] Subscribed to Supabase PostgreSQL Realtime.');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            this.handleDisconnect();
          }
        });
    } catch (err: any) {
      console.error('[Realtime] Error initiating Supabase Realtime:', err);
      this.handleDisconnect();
    }
  }

  /**
   * Reconnection logic with controlled exponential backoff
   */
  private handleDisconnect(): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delayMs = Math.min(1000 * Math.pow(2, this.retryCount - 1), 16000);
      this.setStatus('RECONNECTING');
      console.warn(`[RapidRoute Realtime] Realtime disconnected. Retrying in ${delayMs}ms (Attempt ${this.retryCount}/${this.maxRetries})...`);

      if (this.retryTimeout) clearTimeout(this.retryTimeout);
      this.retryTimeout = setTimeout(() => {
        this.connectSupabaseRealtime();
      }, delayMs);
    } else {
      console.warn('[RapidRoute Realtime] Max retries reached. Falling back to DEMO LIVE MODE.');
      this.setStatus('DEMO_LIVE');
    }
  }

  public cleanup(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.channel && supabase) {
      try {
        supabase.removeChannel(this.channel);
      } catch (err) {
        console.warn('[Realtime] Error removing channel:', err);
      }
      this.channel = null;
    }
  }

  /**
   * Helper dispatchers for operational events (flows both in Connected and Demo Mode)
   */
  public emit<E extends keyof RealtimeEventPayloads>(event: E, payload: RealtimeEventPayloads[E]): void {
    eventBus.emit(event, payload);
  }
}

export const realtimeService = new RealtimeService();
