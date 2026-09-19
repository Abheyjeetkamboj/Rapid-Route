import { AmbulanceStatus, EmergencySeverity, HospitalStatus, TrafficCondition } from '../types';

export function statusLabel(status: AmbulanceStatus): string {
  const map: Record<AmbulanceStatus, string> = {
    AVAILABLE: 'Available',
    EN_ROUTE: 'En Route',
    BUSY: 'Busy',
    OFFLINE: 'Offline',
  };
  return map[status];
}

export function statusColor(status: AmbulanceStatus) {
  const map: Record<AmbulanceStatus, { dot: string; text: string; bg: string }> = {
    AVAILABLE: { dot: 'bg-status-available', text: 'text-status-available', bg: 'bg-accent-greenSubtle' },
    EN_ROUTE:  { dot: 'bg-status-enroute',  text: 'text-status-enroute',  bg: 'bg-accent-amberSubtle' },
    BUSY:      { dot: 'bg-status-busy',      text: 'text-status-busy',      bg: 'bg-accent-redSubtle' },
    OFFLINE:   { dot: 'bg-status-offline',   text: 'text-status-offline',   bg: 'bg-surface-overlay' },
  };
  return map[status];
}

export function severityColor(severity: EmergencySeverity) {
  const map: Record<EmergencySeverity, { dot: string; text: string; bg: string; ring: string }> = {
    Critical: { dot: 'bg-accent-red',   text: 'text-accent-red',   bg: 'bg-accent-redSubtle',   ring: 'ring-accent-red/30' },
    Urgent:   { dot: 'bg-accent-amber', text: 'text-accent-amber', bg: 'bg-accent-amberSubtle', ring: 'ring-accent-amber/30' },
    Routine:  { dot: 'bg-accent-blue',  text: 'text-accent-blue',  bg: 'bg-accent-blueSubtle',  ring: 'ring-accent-blue/30' },
  };
  return map[severity];
}

export function trafficColor(traffic: TrafficCondition | null) {
  if (!traffic) return { text: 'text-fg-faint', label: '—' };
  const map: Record<TrafficCondition, { text: string; label: string }> = {
    Light:    { text: 'text-status-available', label: 'Light' },
    Moderate: { text: 'text-status-enroute',   label: 'Moderate' },
    Heavy:    { text: 'text-status-busy',      label: 'Heavy' },
  };
  return map[traffic];
}

export function hospitalStatusColor(status: HospitalStatus) {
  const map: Record<HospitalStatus, { text: string; bg: string; dot: string }> = {
    Ready:     { text: 'text-status-available', bg: 'bg-accent-greenSubtle', dot: 'bg-status-available' },
    Limited:   { text: 'text-status-enroute',   bg: 'bg-accent-amberSubtle', dot: 'bg-status-enroute' },
    Diverting: { text: 'text-status-busy',      bg: 'bg-accent-redSubtle',   dot: 'bg-status-busy' },
    Full:      { text: 'text-status-busy',      bg: 'bg-accent-redSubtle',   dot: 'bg-status-busy' },
  };
  return map[status];
}
