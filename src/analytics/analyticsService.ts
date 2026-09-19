import type {
  AnalyticsFilterState,
  AnalyticsReport,
  RawAnalyticsContextData,
} from './analyticsTypes';
import {
  aggregateAmbulancePerformance,
  aggregateCriticalMonitoring,
  aggregateDispatchTime,
  aggregateEmergencyVolume,
  aggregateEtaAccuracy,
  aggregateFleetUtilisation,
  aggregateHospitalCoordination,
  aggregateOutcomeFunnel,
  aggregateRecommendation,
  aggregateResponseTime,
  aggregateTrafficPerformance,
  filterEmergencies,
} from './aggregations';
import { calculateDispatchDuration, calculateResponseTime } from './metrics';

export class AnalyticsService {
  /**
   * Generates a comprehensive operational analytics report from raw application state
   */
  generateAnalyticsReport(
    data: RawAnalyticsContextData,
    filters: AnalyticsFilterState,
    volumeGrouping: 'Hourly' | 'Daily' | 'Weekly' = 'Daily'
  ): AnalyticsReport {
    const { emergencies, ambulanceFleet, dispatchHistory, alerts = [], appMode = 'DEMO' } = data;

    // 1. Filter emergencies by criteria
    const filteredEmergencies = filterEmergencies(emergencies, filters);
    const filteredIds = new Set(filteredEmergencies.map((e) => e.id));

    // 2. Compute individual metric sections
    const totalEmergencies = filteredEmergencies.length;
    const completedCount = filteredEmergencies.filter((e) => e.status === 'Completed').length;
    const activeCount = totalEmergencies - completedCount;

    const responseTime = aggregateResponseTime(filteredEmergencies);
    const dispatchTime = aggregateDispatchTime(filteredEmergencies, dispatchHistory);
    const etaAccuracy = aggregateEtaAccuracy(filteredEmergencies);
    const fleetUtilisation = aggregateFleetUtilisation(ambulanceFleet);
    const hospitalCoordination = aggregateHospitalCoordination(filteredEmergencies, alerts, dispatchHistory);
    const recommendation = aggregateRecommendation(dispatchHistory, filteredIds);
    const criticalMonitoring = aggregateCriticalMonitoring(filteredEmergencies, dispatchHistory);
    const volumeTimeSeries = aggregateEmergencyVolume(filteredEmergencies, filters.timeRange, volumeGrouping);
    const ambulancePerformance = aggregateAmbulancePerformance(ambulanceFleet, filteredEmergencies);
    const outcomesFunnel = aggregateOutcomeFunnel(filteredEmergencies, alerts);
    const trafficPerformance = aggregateTrafficPerformance(filteredEmergencies, ambulanceFleet);

    const dataSourceLabel =
      appMode === 'CONNECTED'
        ? ('Connected Mode (Supabase)' as const)
        : ('Demo Mode (Local Storage)' as const);

    return {
      filters,
      dateRangeLabel: filters.timeRange,
      dataSourceLabel,
      totalEmergencies,
      activeEmergenciesCount: activeCount,
      completedEmergenciesCount: completedCount,
      responseTime,
      dispatchTime,
      etaAccuracy,
      fleetUtilisation,
      hospitalCoordination,
      recommendation,
      criticalMonitoring,
      volumeTimeSeries,
      ambulancePerformance,
      outcomesFunnel,
      trafficPerformance,
      filteredEmergencies,
    };
  }

  /**
   * Formats filtered analytics data as CSV string for download or auditing
   */
  generateCsvContent(report: AnalyticsReport): string {
    const headers = [
      'Emergency ID',
      'Reported Time',
      'Severity',
      'Emergency Type',
      'Location',
      'Status',
      'Assigned Ambulance',
      'Predicted ETA (min)',
      'Response Time (min)',
      'Dispatch Duration (min)',
      'Hospital Name',
      'Pre-Alert Status',
    ];

    const rows = report.filteredEmergencies.map((em) => {
      const respTime = calculateResponseTime(em);
      const dispTime = calculateDispatchDuration(em);
      const hosp = em.recommendedHospital?.name || em.preAlert?.hospitalName || 'None';
      const preAlertStatus = em.preAlert?.status || em.recommendedHospital?.preAlertStatus || 'None';

      return [
        `"${em.id}"`,
        `"${em.reportedAt || ''}"`,
        `"${em.severity}"`,
        `"${em.emergencyType}"`,
        `"${em.location.replace(/"/g, '""')}"`,
        `"${em.status}"`,
        `"${em.assignedAmbulance || 'Unassigned'}"`,
        em.etaMinutes !== null && em.etaMinutes !== undefined ? em.etaMinutes : '',
        respTime !== null ? respTime : '',
        dispTime !== null ? dispTime : '',
        `"${hosp}"`,
        `"${preAlertStatus}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Triggers CSV file download in browser
   */
  exportReportCsv(report: AnalyticsReport): void {
    const csv = this.generateCsvContent(report);
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `rapidroute-analytics-report-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const analyticsService = new AnalyticsService();
