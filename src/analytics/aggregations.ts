import type {
  ActiveEmergency,
  Ambulance,
  DispatchSelectionRecord,
  HospitalPreAlert,
} from '../types';
import type {
  AmbulancePerformanceItem,
  AnalyticsFilterState,
  AnalyticsTimeRange,
  CriticalMonitoringMetric,
  DispatchTimeMetric,
  EmergencyVolumePoint,
  EtaAccuracyMetric,
  FleetUtilisationMetric,
  HospitalCoordinationMetric,
  OutcomeFunnelStep,
  RecommendationMetrics,
  ResponseTimeMetric,
  TrafficRoutePerformance,
} from './analyticsTypes';
import {
  calculateAverage,
  calculateDispatchDuration,
  calculateEtaError,
  calculateHandoverDuration,
  calculateHospitalAckDuration,
  calculateHospitalAlertDuration,
  calculateMedian,
  calculateP90,
  calculateResponseTime,
  parseTimestampToDate,
} from './metrics';

/* =============================================================================
   1. MULTI-DIMENSIONAL FILTERING
   ============================================================================= */

export function filterEmergencies(
  emergencies: ActiveEmergency[],
  filters: AnalyticsFilterState
): ActiveEmergency[] {
  const now = new Date();

  return emergencies.filter((em) => {
    // 1. Date Range filtering
    if (em.reportedAt) {
      const emDate = parseTimestampToDate(em.reportedAt, now);
      if (emDate) {
        const diffDays = (now.getTime() - emDate.getTime()) / (1000 * 60 * 60 * 24);

        if (filters.timeRange === 'Today' && diffDays > 1.0) return false;
        if (filters.timeRange === '7 Days' && diffDays > 7.0) return false;
        if (filters.timeRange === '30 Days' && diffDays > 30.0) return false;
        if (filters.timeRange === '90 Days' && diffDays > 90.0) return false;

        if (filters.timeRange === 'Custom') {
          if (filters.customStartDate && emDate < new Date(filters.customStartDate)) return false;
          if (filters.customEndDate && emDate > new Date(filters.customEndDate)) return false;
        }
      }
    }

    // 2. Severity filter
    if (filters.severity !== 'ALL' && em.severity !== filters.severity) {
      return false;
    }

    // 3. Emergency Type filter
    if (filters.emergencyType !== 'ALL' && em.emergencyType !== filters.emergencyType) {
      return false;
    }

    // 4. Ambulance filter
    if (filters.ambulanceId !== 'ALL' && em.assignedAmbulance !== filters.ambulanceId) {
      return false;
    }

    // 5. Hospital filter
    if (filters.hospitalId !== 'ALL') {
      const matchedHosp = em.selectedHospitalId === filters.hospitalId || em.preAlert?.hospitalId === filters.hospitalId;
      if (!matchedHosp) return false;
    }

    // 6. Dispatch Status filter
    if (filters.dispatchStatus !== 'ALL') {
      if (filters.dispatchStatus === 'COMPLETED' && em.status !== 'Completed') return false;
      if (filters.dispatchStatus === 'ACTIVE' && em.status === 'Completed') return false;
      if (filters.dispatchStatus === 'AWAITING' && em.status !== 'Awaiting Dispatch') return false;
      if (filters.dispatchStatus === 'DISPATCHED' && em.status !== 'Dispatched' && em.status !== 'En Route' && em.status !== 'Transporting') return false;
    }

    return true;
  });
}

/* =============================================================================
   2. RESPONSE & DISPATCH TIME AGGREGATION
   ============================================================================= */

export function aggregateResponseTime(emergencies: ActiveEmergency[]): ResponseTimeMetric {
  const responseTimes: number[] = [];

  for (const em of emergencies) {
    const rt = calculateResponseTime(em);
    if (rt !== null && rt > 0) {
      responseTimes.push(rt);
    }
  }

  const sampleCount = responseTimes.length;
  const avg = calculateAverage(responseTimes);
  const med = calculateMedian(responseTimes);
  const p90 = calculateP90(responseTimes);

  return {
    averageMinutes: avg,
    medianMinutes: med,
    p90Minutes: p90,
    sampleCount,
    hasEnoughDataForP90: sampleCount >= 5,
  };
}

export function aggregateDispatchTime(
  emergencies: ActiveEmergency[],
  dispatches: DispatchSelectionRecord[]
): DispatchTimeMetric {
  const dispatchTimes: number[] = [];

  for (const em of emergencies) {
    const disp = dispatches.find((d) => d.emergencyId === em.id);
    const dur = calculateDispatchDuration(em, disp);
    if (dur !== null && dur > 0) {
      dispatchTimes.push(dur);
    }
  }

  return {
    averageMinutes: calculateAverage(dispatchTimes),
    medianMinutes: calculateMedian(dispatchTimes),
    sampleCount: dispatchTimes.length,
  };
}

/* =============================================================================
   3. ETA ACCURACY AGGREGATION
   ============================================================================= */

export function aggregateEtaAccuracy(emergencies: ActiveEmergency[]): EtaAccuracyMetric {
  const errors: number[] = [];

  for (const em of emergencies) {
    const err = calculateEtaError(em);
    if (err !== null) {
      errors.push(err);
    }
  }

  if (errors.length === 0) {
    return {
      averageErrorMinutes: null,
      medianErrorMinutes: null,
      percentWithin5Min: null,
      percentWithin10Min: null,
      completedTripCount: 0,
      hasData: false,
    };
  }

  const within5 = errors.filter((e) => e <= 5.0).length;
  const within10 = errors.filter((e) => e <= 10.0).length;

  return {
    averageErrorMinutes: calculateAverage(errors),
    medianErrorMinutes: calculateMedian(errors),
    percentWithin5Min: Number(((within5 / errors.length) * 100).toFixed(1)),
    percentWithin10Min: Number(((within10 / errors.length) * 100).toFixed(1)),
    completedTripCount: errors.length,
    hasData: true,
  };
}

/* =============================================================================
   4. FLEET UTILISATION AGGREGATION
   ============================================================================= */

export function aggregateFleetUtilisation(ambulances: Ambulance[]): FleetUtilisationMetric {
  const total = ambulances.length;
  if (total === 0) {
    return {
      utilisationPercent: 0,
      activeUnitsCount: 0,
      totalUnitsCount: 0,
      statusBreakdown: { available: 0, dispatched: 0, enRoute: 0, atHospital: 0, offline: 0 },
    };
  }

  let available = 0;
  let dispatched = 0;
  let enRoute = 0;
  let atHospital = 0;
  let offline = 0;

  for (const amb of ambulances) {
    switch (amb.status) {
      case 'AVAILABLE':
        available++;
        break;
      case 'EN_ROUTE':
        enRoute++;
        break;
      case 'BUSY':
        atHospital++;
        break;
      case 'OFFLINE':
        offline++;
        break;
      default:
        available++;
    }
  }

  const active = dispatched + enRoute + atHospital;
  const utilisation = Number(((active / Math.max(1, total - offline)) * 100).toFixed(1));

  return {
    utilisationPercent: utilisation,
    activeUnitsCount: active,
    totalUnitsCount: total,
    statusBreakdown: { available, dispatched, enRoute, atHospital, offline },
  };
}

/* =============================================================================
   5. HOSPITAL COORDINATION TIMINGS
   ============================================================================= */

export function aggregateHospitalCoordination(
  emergencies: ActiveEmergency[],
  alerts: HospitalPreAlert[],
  dispatches: DispatchSelectionRecord[]
): HospitalCoordinationMetric {
  const preAlertTimes: number[] = [];
  const ackTimes: number[] = [];
  const handoverTimes: number[] = [];

  for (const em of emergencies) {
    const alert = alerts.find((a) => a.incidentId === em.id) || em.preAlert;
    const disp = dispatches.find((d) => d.emergencyId === em.id);

    if (alert) {
      const preAlertDur = calculateHospitalAlertDuration(alert, disp);
      if (preAlertDur !== null) preAlertTimes.push(preAlertDur);

      const ackDur = calculateHospitalAckDuration(alert);
      if (ackDur !== null) ackTimes.push(ackDur);

      const handoverDur = calculateHandoverDuration(alert);
      if (handoverDur !== null) handoverTimes.push(handoverDur);
    }
  }

  const completedCount = handoverTimes.length;

  return {
    avgPreAlertMinutes: calculateAverage(preAlertTimes),
    avgAckMinutes: calculateAverage(ackTimes),
    avgHandoverMinutes: calculateAverage(handoverTimes),
    medianHandoverMinutes: calculateMedian(handoverTimes),
    completedHandoverCount: completedCount,
    hasData: completedCount > 0 || preAlertTimes.length > 0,
  };
}

/* =============================================================================
   6. DISPATCH RECOMMENDATION INTELLIGENCE
   ============================================================================= */

export function aggregateRecommendation(
  dispatches: DispatchSelectionRecord[],
  filteredEmergencyIds?: Set<string>
): RecommendationMetrics {
  const relevantDispatches = filteredEmergencyIds
    ? dispatches.filter((d) => filteredEmergencyIds.has(d.emergencyId))
    : dispatches;

  const total = relevantDispatches.length;
  if (total === 0) {
    return {
      totalEvaluated: 0,
      acceptedCount: 0,
      acceptanceRate: 100,
      overriddenCount: 0,
      overrideRate: 0,
      commonOverrideReasons: [],
    };
  }

  let overridden = 0;
  const reasonMap: Record<string, number> = {};

  for (const d of relevantDispatches) {
    if (d.isOverride) {
      overridden++;
      const reason = d.overrideReason?.trim() || 'Dispatcher situational judgment';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    }
  }

  const accepted = total - overridden;
  const overrideRate = Number(((overridden / total) * 100).toFixed(1));
  const acceptanceRate = Number(((accepted / total) * 100).toFixed(1));

  const reasonsList = Object.entries(reasonMap).map(([reason, count]) => ({
    reason,
    count,
    percentage: Number(((count / Math.max(1, overridden)) * 100).toFixed(1)),
  }));
  reasonsList.sort((a, b) => b.count - a.count);

  return {
    totalEvaluated: total,
    acceptedCount: accepted,
    acceptanceRate,
    overriddenCount: overridden,
    overrideRate,
    commonOverrideReasons: reasonsList,
  };
}

/* =============================================================================
   7. AMBULANCE FLEET PERFORMANCE
   ============================================================================= */

export function aggregateAmbulancePerformance(
  ambulances: Ambulance[],
  emergencies: ActiveEmergency[]
): AmbulancePerformanceItem[] {
  return ambulances.map((amb) => {
    const assignedEmergencies = emergencies.filter((e) => e.assignedAmbulance === amb.id);
    const trips = assignedEmergencies.length;
    const completed = assignedEmergencies.filter((e) => e.status === 'Completed').length;

    const responseTimes: number[] = [];
    const etaErrors: number[] = [];

    for (const em of assignedEmergencies) {
      const rt = calculateResponseTime(em);
      if (rt !== null && rt > 0) responseTimes.push(rt);

      const err = calculateEtaError(em);
      if (err !== null) etaErrors.push(err);
    }

    return {
      ambulanceId: amb.id,
      driverName: amb.driverName,
      capability: amb.capability,
      currentStatus: amb.status,
      trips,
      completedIncidents: completed,
      avgResponseMinutes: calculateAverage(responseTimes),
      avgEtaErrorMinutes: calculateAverage(etaErrors),
    };
  });
}

/* =============================================================================
   8. INCIDENT OUTCOMES FUNNEL
   ============================================================================= */

export function aggregateOutcomeFunnel(
  emergencies: ActiveEmergency[],
  alerts: HospitalPreAlert[]
): OutcomeFunnelStep[] {
  const total = emergencies.length;
  if (total === 0) return [];

  const created = total;
  const dispatched = emergencies.filter((e) => e.assignedAmbulance !== null).length;
  const enRoute = emergencies.filter(
    (e) => e.status === 'En Route' || e.status === 'Transporting' || e.status === 'Completed'
  ).length;
  const hospitalSelected = emergencies.filter(
    (e) => e.selectedHospitalId !== null || e.preAlert !== undefined
  ).length;

  const preAlertSent = emergencies.filter((e) => {
    const al = alerts.find((a) => a.incidentId === e.id) || e.preAlert;
    return al?.status && al.status !== 'DRAFT' && al.status !== 'READY_TO_SEND';
  }).length;

  const arrived = emergencies.filter(
    (e) => e.dispatchStage === 'Arrived' || e.status === 'Transporting' || e.status === 'Completed'
  ).length;

  const completed = emergencies.filter((e) => e.status === 'Completed').length;

  const steps = [
    { stage: 'Emergency Created', count: created, description: 'CAD calls received and registered' },
    { stage: 'Dispatch Completed', count: dispatched, description: 'Ambulance assigned by dispatcher' },
    { stage: 'En Route', count: enRoute, description: 'Unit active in transit corridor' },
    { stage: 'Hospital Selected', count: hospitalSelected, description: 'Receiving trauma/ER destination selected' },
    { stage: 'Pre-Alert Sent', count: preAlertSent, description: 'Structured HL7 pre-alert transmitted' },
    { stage: 'Hospital Arrival', count: arrived, description: 'Ambulance at emergency intake bay' },
    { stage: 'Handover Completed', count: completed, description: 'Clinical nursing transfer signed off' },
  ];

  return steps.map((s) => ({
    ...s,
    conversionPercent: Number(((s.count / created) * 100).toFixed(1)),
  }));
}

/* =============================================================================
   9. CRITICAL INCIDENT OPERATIONAL MONITORING
   ============================================================================= */

export function aggregateCriticalMonitoring(
  emergencies: ActiveEmergency[],
  dispatches: DispatchSelectionRecord[]
): CriticalMonitoringMetric {
  const criticals = emergencies.filter((e) => e.severity === 'Critical');
  const completed = criticals.filter((e) => e.status === 'Completed').length;

  const dispatchTimes: number[] = [];
  const responseTimes: number[] = [];

  for (const em of criticals) {
    const disp = dispatches.find((d) => d.emergencyId === em.id);
    const dTime = calculateDispatchDuration(em, disp);
    if (dTime !== null) dispatchTimes.push(dTime);

    const rTime = calculateResponseTime(em);
    if (rTime !== null) responseTimes.push(rTime);
  }

  return {
    totalCritical: criticals.length,
    completedCritical: completed,
    avgCriticalDispatchMinutes: calculateAverage(dispatchTimes),
    avgCriticalResponseMinutes: calculateAverage(responseTimes),
  };
}

/* =============================================================================
   10. TRAFFIC ROUTE PERFORMANCE
   ============================================================================= */

export function aggregateTrafficPerformance(
  emergencies: ActiveEmergency[],
  ambulances: Ambulance[]
): TrafficRoutePerformance {
  const lightEtas: number[] = [];
  const modEtas: number[] = [];
  const heavyEtas: number[] = [];

  for (const em of emergencies) {
    const assignedAmb = ambulances.find((a) => a.id === em.assignedAmbulance);
    const traffic = assignedAmb?.trafficCondition || em.ambulanceDetails?.traffic;
    const eta = em.etaMinutes || em.ambulanceDetails?.etaMinutes;

    if (eta !== undefined && eta !== null && eta > 0) {
      if (traffic === 'Light') lightEtas.push(eta);
      else if (traffic === 'Moderate') modEtas.push(eta);
      else if (traffic === 'Heavy') heavyEtas.push(eta);
    }
  }

  return {
    light: { avgEta: calculateAverage(lightEtas), count: lightEtas.length },
    moderate: { avgEta: calculateAverage(modEtas), count: modEtas.length },
    heavy: { avgEta: calculateAverage(heavyEtas), count: heavyEtas.length },
  };
}

/* =============================================================================
   11. TIME-SERIES VOLUME BREAKDOWN
   ============================================================================= */

export function aggregateEmergencyVolume(
  emergencies: ActiveEmergency[],
  timeRange: AnalyticsTimeRange,
  grouping: 'Hourly' | 'Daily' | 'Weekly'
): EmergencyVolumePoint[] {
  if (emergencies.length === 0) return [];

  // Group into logical buckets based on reportedAt
  const buckets: Record<string, { critical: number; urgent: number; routine: number; total: number }> = {};

  const now = new Date();

  // If timeRange is 'Today' or grouping is 'Hourly', create 4-hour intervals
  if (timeRange === 'Today' || grouping === 'Hourly') {
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    hours.forEach((h) => {
      buckets[h] = { critical: 0, urgent: 0, routine: 0, total: 0 };
    });

    for (const em of emergencies) {
      const d = parseTimestampToDate(em.reportedAt, now);
      if (d) {
        const h = d.getHours();
        const slot = hours[Math.floor(h / 4)] || hours[hours.length - 1];
        if (buckets[slot]) {
          if (em.severity === 'Critical') buckets[slot].critical++;
          else if (em.severity === 'Urgent') buckets[slot].urgent++;
          else buckets[slot].routine++;
          buckets[slot].total++;
        }
      }
    }

    return hours.map((h) => ({
      timestamp: h,
      label: h,
      critical: buckets[h].critical,
      urgent: buckets[h].urgent,
      routine: buckets[h].routine,
      total: buckets[h].total,
    }));
  }

  // Daily grouping for 7 Days and 30 Days
  const days = timeRange === '7 Days' ? 7 : timeRange === '30 Days' ? 14 : 12;
  const result: EmergencyVolumePoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    buckets[dateStr] = { critical: 0, urgent: 0, routine: 0, total: 0 };
  }

  for (const em of emergencies) {
    const d = parseTimestampToDate(em.reportedAt, now);
    if (d) {
      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (buckets[dateStr]) {
        if (em.severity === 'Critical') buckets[dateStr].critical++;
        else if (em.severity === 'Urgent') buckets[dateStr].urgent++;
        else buckets[dateStr].routine++;
        buckets[dateStr].total++;
      }
    }
  }

  for (const [dateStr, counts] of Object.entries(buckets)) {
    result.push({
      timestamp: dateStr,
      label: dateStr,
      critical: counts.critical,
      urgent: counts.urgent,
      routine: counts.routine,
      total: counts.total,
    });
  }

  return result;
}

