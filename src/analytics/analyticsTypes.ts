import type {
  ActiveEmergency,
  Ambulance,
  DispatchEvent,
  DispatchSelectionRecord,
  EmergencySeverity,
  Hospital,
  HospitalPreAlert,
} from '../types';

/* =============================================================================
   FILTER STATE TYPES
   ============================================================================= */

export type AnalyticsTimeRange = 'Today' | '7 Days' | '30 Days' | '90 Days' | 'Custom';

export interface AnalyticsFilterState {
  timeRange: AnalyticsTimeRange;
  customStartDate?: string;
  customEndDate?: string;
  severity: 'ALL' | EmergencySeverity;
  emergencyType: 'ALL' | string;
  ambulanceId: 'ALL' | string;
  hospitalId: 'ALL' | string;
  dispatchStatus: 'ALL' | string;
}

/* =============================================================================
   METRIC DATA STRUCTURES
   ============================================================================= */

export interface ResponseTimeMetric {
  averageMinutes: number | null;
  medianMinutes: number | null;
  p90Minutes: number | null;
  sampleCount: number;
  hasEnoughDataForP90: boolean;
}

export interface DispatchTimeMetric {
  averageMinutes: number | null;
  medianMinutes: number | null;
  sampleCount: number;
}

export interface EtaAccuracyMetric {
  averageErrorMinutes: number | null;
  medianErrorMinutes: number | null;
  percentWithin5Min: number | null;
  percentWithin10Min: number | null;
  completedTripCount: number;
  hasData: boolean;
}

export interface FleetUtilisationMetric {
  utilisationPercent: number;
  activeUnitsCount: number;
  totalUnitsCount: number;
  statusBreakdown: {
    available: number;
    dispatched: number;
    enRoute: number;
    atHospital: number;
    offline: number;
  };
}

export interface HospitalCoordinationMetric {
  avgPreAlertMinutes: number | null;
  avgAckMinutes: number | null;
  avgHandoverMinutes: number | null;
  medianHandoverMinutes: number | null;
  completedHandoverCount: number;
  hasData: boolean;
}

export interface OverrideReasonStat {
  reason: string;
  count: number;
  percentage: number;
}

export interface RecommendationMetrics {
  totalEvaluated: number;
  acceptedCount: number;
  acceptanceRate: number;
  overriddenCount: number;
  overrideRate: number;
  commonOverrideReasons: OverrideReasonStat[];
}

export interface AmbulancePerformanceItem {
  ambulanceId: string;
  driverName: string;
  capability: string;
  currentStatus: string;
  trips: number;
  avgResponseMinutes: number | null;
  avgEtaErrorMinutes: number | null;
  completedIncidents: number;
}

export interface OutcomeFunnelStep {
  stage: string;
  count: number;
  conversionPercent: number;
  description: string;
}

export interface CriticalMonitoringMetric {
  totalCritical: number;
  completedCritical: number;
  avgCriticalDispatchMinutes: number | null;
  avgCriticalResponseMinutes: number | null;
}

export interface TrafficRoutePerformance {
  light: { avgEta: number | null; count: number };
  moderate: { avgEta: number | null; count: number };
  heavy: { avgEta: number | null; count: number };
}

export interface EmergencyVolumePoint {
  timestamp: string;
  label: string;
  critical: number;
  urgent: number;
  routine: number;
  total: number;
}

/* =============================================================================
   AGGREGATED REPORT CONTRACT
   ============================================================================= */

export interface AnalyticsReport {
  filters: AnalyticsFilterState;
  dateRangeLabel: string;
  dataSourceLabel: 'Demo Mode (Local Storage)' | 'Connected Mode (Supabase)';

  // Summary counts
  totalEmergencies: number;
  activeEmergenciesCount: number;
  completedEmergenciesCount: number;

  // Key KPI sections
  responseTime: ResponseTimeMetric;
  dispatchTime: DispatchTimeMetric;
  etaAccuracy: EtaAccuracyMetric;
  fleetUtilisation: FleetUtilisationMetric;
  hospitalCoordination: HospitalCoordinationMetric;
  recommendation: RecommendationMetrics;
  criticalMonitoring: CriticalMonitoringMetric;

  // Detailed breakdowns
  volumeTimeSeries: EmergencyVolumePoint[];
  ambulancePerformance: AmbulancePerformanceItem[];
  outcomesFunnel: OutcomeFunnelStep[];
  trafficPerformance: TrafficRoutePerformance;

  // Raw filtered items for table inspection & CSV export
  filteredEmergencies: ActiveEmergency[];
}

export interface RawAnalyticsContextData {
  emergencies: ActiveEmergency[];
  ambulanceFleet: Ambulance[];
  hospitals: Hospital[];
  activityEvents: DispatchEvent[];
  dispatchHistory: DispatchSelectionRecord[];
  alerts?: HospitalPreAlert[];
  appMode?: 'DEMO' | 'CONNECTED';
}

