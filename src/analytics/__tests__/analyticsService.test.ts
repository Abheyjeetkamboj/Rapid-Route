import { describe, it, expect } from 'vitest';
import {
  calculateResponseTime,
  calculateDispatchDuration,
  calculateEtaError,
  calculateHospitalAlertDuration,
  calculateHospitalAckDuration,
  calculateHandoverDuration,
  calculateAverage,
  calculateMedian,
  calculateP90,
  formatMinutesSeconds,
  diffInMinutes,
} from '../metrics';
import {
  filterEmergencies,
  aggregateFleetUtilisation,
  aggregateRecommendation,
  aggregateOutcomeFunnel,
  aggregateTrafficPerformance,
} from '../aggregations';
import { analyticsService } from '../analyticsService';
import type { ActiveEmergency, DispatchSelectionRecord, HospitalPreAlert } from '../../types';
import type { AnalyticsFilterState, RawAnalyticsContextData } from '../analyticsTypes';
import { SEED_AMBULANCES, SEED_HOSPITALS, SEED_EMERGENCIES, SEED_DISPATCHES, SEED_ALERTS } from '../../data/seed/seedData';

describe('RapidRoute AI — Step 8: Analytics & Operational Intelligence', () => {
  const defaultFilters: AnalyticsFilterState = {
    timeRange: '30 Days',
    severity: 'ALL',
    emergencyType: 'ALL',
    ambulanceId: 'ALL',
    hospitalId: 'ALL',
    dispatchStatus: 'ALL',
  };

  /* =============================================================================
     1. PURE METRIC CALCULATIONS
     ============================================================================= */
  describe('Metrics Calculations', () => {
    it('1. calculates response time correctly from explicit or derived arrival', () => {
      const em1: ActiveEmergency = {
        id: 'INC-T1',
        location: 'Sector 17',
        emergencyType: 'Cardiac',
        severity: 'Critical',
        patientCount: 1,
        requiredCapability: 'ALS',
        notes: '',
        status: 'Completed',
        dispatchStage: 'Completed',
        assignedAmbulance: 'RR-101',
        etaMinutes: 8,
        actualResponseMinutes: 9.4,
        reportedAt: '12:00 IST',
        timeline: [],
      };
      expect(calculateResponseTime(em1)).toBe(9.4);

      // Incomplete incident still awaiting dispatch should have null response time
      const emAwaiting: ActiveEmergency = {
        ...em1,
        status: 'Awaiting Dispatch',
        dispatchStage: 'Awaiting dispatch',
        actualResponseMinutes: undefined,
      };
      expect(calculateResponseTime(emAwaiting)).toBeNull();
    });

    it('2. calculates dispatch duration correctly between intake and dispatch', () => {
      const em: ActiveEmergency = {
        id: 'INC-T2',
        location: 'Zirakpur',
        emergencyType: 'Trauma',
        severity: 'Urgent',
        patientCount: 1,
        requiredCapability: 'ALS',
        notes: '',
        status: 'Dispatched',
        dispatchStage: 'Dispatched',
        assignedAmbulance: 'RR-204',
        etaMinutes: 10,
        reportedAt: '14:00 IST',
        timeline: [],
      };
      const disp: DispatchSelectionRecord = {
        emergencyId: 'INC-T2',
        recommendedAmbulanceId: 'RR-204',
        selectedAmbulanceId: 'RR-204',
        isOverride: false,
        timestamp: '14:02 IST',
        authorizedBy: 'Officer S. Sharma',
      };

      const duration = calculateDispatchDuration(em, disp);
      expect(duration).toBe(2.0);
    });

    it('3. calculates ETA error (|Predicted - Actual|)', () => {
      const em: ActiveEmergency = {
        id: 'INC-T3',
        location: 'Mohali',
        emergencyType: 'Respiratory',
        severity: 'Critical',
        patientCount: 1,
        requiredCapability: 'ICU',
        notes: '',
        status: 'Completed',
        dispatchStage: 'Completed',
        assignedAmbulance: 'RR-305',
        etaMinutes: 10,
        actualArrivalMinutes: 8.5,
        reportedAt: '15:00 IST',
        timeline: [],
      };

      // |10 - 8.5| = 1.5
      expect(calculateEtaError(em)).toBe(1.5);
    });

    it('4. calculates hospital pre-alert duration (dispatch to pre-alert sent)', () => {
      const alert: HospitalPreAlert = {
        id: 'ALT-1',
        incidentId: 'INC-T4',
        severity: 'Critical',
        emergencyType: 'Cardiac',
        patientCount: 1,
        symptoms: [],
        ambulanceId: 'RR-204',
        ambulanceEta: 8,
        hospitalId: 'HOSP-01',
        hospitalName: 'City Hospital',
        requiredPreparation: 'Cath lab',
        sentAt: '16:03 IST',
        status: 'SENT',
      };
      const disp: DispatchSelectionRecord = {
        emergencyId: 'INC-T4',
        recommendedAmbulanceId: 'RR-204',
        selectedAmbulanceId: 'RR-204',
        isOverride: false,
        timestamp: '16:01 IST',
        authorizedBy: 'Officer S. Sharma',
      };

      const dur = calculateHospitalAlertDuration(alert, disp);
      expect(dur).toBe(2.0);
    });

    it('5. calculates hospital acknowledgement and handover duration', () => {
      const alert: HospitalPreAlert = {
        id: 'ALT-2',
        incidentId: 'INC-T5',
        severity: 'Urgent',
        emergencyType: 'Trauma',
        patientCount: 1,
        symptoms: [],
        ambulanceId: 'RR-101',
        ambulanceEta: 6,
        hospitalId: 'HOSP-02',
        hospitalName: 'Apollo',
        requiredPreparation: 'Ortho bay',
        sentAt: '18:00 IST',
        acknowledgedAt: '18:02 IST',
        arrivedAt: '18:10 IST',
        handoverCompletedAt: '18:14 IST',
        status: 'HANDOVER_COMPLETED',
      };

      expect(calculateHospitalAckDuration(alert)).toBe(2.0);
      expect(calculateHandoverDuration(alert)).toBe(4.0);
    });
  });

  /* =============================================================================
     2. STATISTICAL UTILITIES & FORMATTING
     ============================================================================= */
  describe('Statistical Helpers', () => {
    it('calculates average and median accurately', () => {
      const numbers = [4, 8, 6, 10, 2]; // sorted: 2, 4, 6, 8, 10
      expect(calculateAverage(numbers)).toBe(6);
      expect(calculateMedian(numbers)).toBe(6);

      const evenNumbers = [2, 4, 8, 10]; // median: (4 + 8) / 2 = 6
      expect(calculateMedian(evenNumbers)).toBe(6);
    });

    it('enforces P90 sample threshold (requires >= 5 observations)', () => {
      const smallSample = [5, 8, 10];
      expect(calculateP90(smallSample)).toBeNull();

      const adequateSample = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
      expect(calculateP90(adequateSample)).toBeDefined();
      expect(calculateP90(adequateSample)).toBe(18);
    });

    it('formats minutes as MM:SS with fallback', () => {
      expect(formatMinutesSeconds(8.5)).toBe('08:30');
      expect(formatMinutesSeconds(2.25)).toBe('02:15');
      expect(formatMinutesSeconds(null)).toBe('Insufficient data');
      expect(formatMinutesSeconds(null, 'N/A')).toBe('N/A');
    });

    it('calculates time difference across timestamps', () => {
      expect(diffInMinutes('10:00 IST', '10:15 IST')).toBe(15);
      expect(diffInMinutes('23:55 IST', '00:05 IST')).toBe(10); // midnight wrap
    });
  });

  /* =============================================================================
     3. FILTERING & AGGREGATIONS
     ============================================================================= */
  describe('Multi-dimensional Filtering', () => {
    it('filters emergencies by severity tier', () => {
      const criticalOnly = filterEmergencies(SEED_EMERGENCIES, {
        ...defaultFilters,
        severity: 'Critical',
      });
      expect(criticalOnly.length).toBeGreaterThan(0);
      expect(criticalOnly.every((e) => e.severity === 'Critical')).toBe(true);

      const routineOnly = filterEmergencies(SEED_EMERGENCIES, {
        ...defaultFilters,
        severity: 'Routine',
      });
      expect(routineOnly.every((e) => e.severity === 'Routine')).toBe(true);
    });

    it('filters emergencies by date range', () => {
      const todayOnly = filterEmergencies(SEED_EMERGENCIES, {
        ...defaultFilters,
        timeRange: 'Today',
      });
      const thirtyDays = filterEmergencies(SEED_EMERGENCIES, {
        ...defaultFilters,
        timeRange: '30 Days',
      });

      expect(thirtyDays.length).toBeGreaterThanOrEqual(todayOnly.length);
    });

    it('filters emergencies by ambulance unit', () => {
      const rr204Units = filterEmergencies(SEED_EMERGENCIES, {
        ...defaultFilters,
        ambulanceId: 'RR-204',
      });
      expect(rr204Units.every((e) => e.assignedAmbulance === 'RR-204')).toBe(true);
    });
  });

  /* =============================================================================
     4. RECOMMENDATION ACCEPTANCE & OVERRIDES
     ============================================================================= */
  describe('Dispatch Engine Recommendation Analytics', () => {
    it('calculates recommendation acceptance rate and override rate neutrally', () => {
      const result = aggregateRecommendation(SEED_DISPATCHES);
      expect(result.totalEvaluated).toBeGreaterThan(0);
      expect(result.acceptanceRate + result.overrideRate).toBeCloseTo(100, 0);

      expect(result.overriddenCount).toBeGreaterThan(0);
      expect(result.commonOverrideReasons.length).toBeGreaterThan(0);
      expect(result.commonOverrideReasons[0]).toHaveProperty('reason');
      expect(result.commonOverrideReasons[0]).toHaveProperty('count');
    });
  });

  /* =============================================================================
     5. FLEET UTILISATION & OUTCOMES FUNNEL
     ============================================================================= */
  describe('Fleet Utilisation & Funnel', () => {
    it('calculates fleet utilisation accurately based on active operational units', () => {
      const fleetMetrics = aggregateFleetUtilisation(SEED_AMBULANCES);
      expect(fleetMetrics.totalUnitsCount).toBe(SEED_AMBULANCES.length);
      expect(fleetMetrics.utilisationPercent).toBeGreaterThanOrEqual(0);
      expect(fleetMetrics.utilisationPercent).toBeLessThanOrEqual(100);
      expect(fleetMetrics.statusBreakdown).toHaveProperty('available');
      expect(fleetMetrics.statusBreakdown).toHaveProperty('enRoute');
    });

    it('generates outcomes lifecycle funnel stages in chronological order', () => {
      const funnel = aggregateOutcomeFunnel(SEED_EMERGENCIES, SEED_ALERTS);
      expect(funnel.length).toBe(7);
      expect(funnel[0].stage).toBe('Emergency Created');
      expect(funnel[funnel.length - 1].stage).toBe('Handover Completed');
      expect(funnel[0].count).toBeGreaterThanOrEqual(funnel[funnel.length - 1].count);
    });

    it('aggregates traffic route performance across congestion tiers', () => {
      const traffic = aggregateTrafficPerformance(SEED_EMERGENCIES, SEED_AMBULANCES);
      expect(traffic).toHaveProperty('light');
      expect(traffic).toHaveProperty('moderate');
      expect(traffic).toHaveProperty('heavy');
    });
  });

  /* =============================================================================
     6. ANALYTICS SERVICE INTEGRATION & CSV EXPORT
     ============================================================================= */
  describe('Analytics Service Orchestration', () => {
    const mockContextData: RawAnalyticsContextData = {
      emergencies: SEED_EMERGENCIES,
      ambulanceFleet: SEED_AMBULANCES,
      hospitals: SEED_HOSPITALS,
      activityEvents: [],
      dispatchHistory: SEED_DISPATCHES,
      alerts: SEED_ALERTS,
      appMode: 'DEMO',
    };

    it('generates complete analytics report from persistent data', () => {
      const report = analyticsService.generateAnalyticsReport(mockContextData, defaultFilters);

      expect(report.totalEmergencies).toBeGreaterThan(0);
      expect(report.completedEmergenciesCount).toBeGreaterThan(0);
      expect(report.responseTime.sampleCount).toBeGreaterThan(0);
      expect(report.etaAccuracy.hasData).toBe(true);
      expect(report.volumeTimeSeries.length).toBeGreaterThan(0);
      expect(report.ambulancePerformance.length).toBe(SEED_AMBULANCES.length);
      expect(report.dataSourceLabel).toContain('Demo Mode');
    });

    it('handles empty data situations gracefully without NaN or errors', () => {
      const emptyContext: RawAnalyticsContextData = {
        emergencies: [],
        ambulanceFleet: [],
        hospitals: [],
        activityEvents: [],
        dispatchHistory: [],
        alerts: [],
        appMode: 'DEMO',
      };

      const emptyReport = analyticsService.generateAnalyticsReport(emptyContext, defaultFilters);
      expect(emptyReport.totalEmergencies).toBe(0);
      expect(emptyReport.responseTime.averageMinutes).toBeNull();
      expect(emptyReport.etaAccuracy.hasData).toBe(false);
      expect(emptyReport.recommendation.totalEvaluated).toBe(0);
    });

    it('generates valid CSV export content matching filtered dataset', () => {
      const report = analyticsService.generateAnalyticsReport(mockContextData, defaultFilters);
      const csv = analyticsService.generateCsvContent(report);

      expect(typeof csv).toBe('string');
      const lines = csv.split('\n');
      expect(lines.length).toBe(report.filteredEmergencies.length + 1); // Header + records
      expect(lines[0]).toContain('Emergency ID');
      expect(lines[0]).toContain('Response Time (min)');
    });
  });
});
