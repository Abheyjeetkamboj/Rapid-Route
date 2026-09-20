import { useState, useMemo } from 'react';
import {
  Clock,
  Target,
  Truck,
  Activity,
  Download,
  RotateCcw,
  Info,
  CheckCircle2,
  Sliders,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useDispatchContext } from '../context/DispatchContext';
import { analyticsService } from '../analytics/analyticsService';
import type { AnalyticsFilterState, AnalyticsTimeRange } from '../analytics/analyticsTypes';
import { formatMinutesSeconds } from '../analytics/metrics';

export default function AnalyticsPage() {
  const {
    emergencies,
    ambulanceFleet,
    hospitals,
    activityEvents,
    dispatchHistory,
    appMode,
  } = useDispatchContext();

  // Filter State
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    timeRange: '30 Days',
    severity: 'ALL',
    emergencyType: 'ALL',
    ambulanceId: 'ALL',
    hospitalId: 'ALL',
    dispatchStatus: 'ALL',
  });

  const [volumeGrouping, setVolumeGrouping] = useState<'Hourly' | 'Daily' | 'Weekly'>('Daily');

  // Table Sorting State
  const [sortField, setSortField] = useState<'trips' | 'avgResponseMinutes' | 'avgEtaErrorMinutes' | 'completedIncidents'>('trips');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Active Tooltip State
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Derive unique emergency types for dropdown
  const uniqueEmergencyTypes = useMemo(() => {
    const set = new Set<string>();
    emergencies.forEach((e) => {
      if (e.emergencyType) set.add(e.emergencyType);
    });
    return Array.from(set).sort();
  }, [emergencies]);

  // Compute Full Analytics Report
  const report = useMemo(() => {
    return analyticsService.generateAnalyticsReport(
      {
        emergencies,
        ambulanceFleet,
        hospitals,
        activityEvents,
        dispatchHistory,
        appMode,
      },
      filters,
      volumeGrouping
    );
  }, [emergencies, ambulanceFleet, hospitals, activityEvents, dispatchHistory, appMode, filters, volumeGrouping]);

  // Sorted fleet performance
  const sortedFleet = useMemo(() => {
    return [...report.ambulancePerformance].sort((a, b) => {
      let valA = a[sortField] ?? (sortAsc ? 999 : -999);
      let valB = b[sortField] ?? (sortAsc ? 999 : -999);
      if (valA === valB) return 0;
      return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [report.ambulancePerformance, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      timeRange: '30 Days',
      severity: 'ALL',
      emergencyType: 'ALL',
      ambulanceId: 'ALL',
      hospitalId: 'ALL',
      dispatchStatus: 'ALL',
    });
  };

  const handleExport = () => {
    analyticsService.exportReportCsv(report);
  };

  const timeRanges: AnalyticsTimeRange[] = ['Today', '7 Days', '30 Days', '90 Days'];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto text-fg transition-colors">
      {/* =========================================================================
          1. HEADER & GLOBAL CONTROLS
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-border-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-accent-blue font-bold">
              CAD AUDIT & INTELLIGENCE
            </span>
            <span className="text-fg-faint">·</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-surface border border-border">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  appMode === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-fg-muted">{report.dataSourceLabel}</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">OPERATIONS ANALYTICS</h1>
          <p className="text-sm text-fg-muted">
            Understand response performance, fleet utilisation and emergency network activity across verified dispatch records.
          </p>
        </div>

        {/* Global Action & Date Range Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="inline-flex items-center p-1 bg-surface-raised rounded-xl border border-border-subtle shadow-xs">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setFilters((prev) => ({ ...prev, timeRange: range }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filters.timeRange === range
                    ? 'bg-surface text-fg shadow-xs border border-border-subtle'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Export Report CSV Button */}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 shadow-sm transition-all"
            title="Download CSV report matching current filters"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT REPORT</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. MULTI-DIMENSIONAL FILTERS BAR
          ========================================================================= */}
      <div className="p-4 rounded-xl bg-surface border border-border-subtle shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-fg-muted mr-1">
            <Calendar className="w-3.5 h-3.5 text-accent-blue" />
            <span>Filters:</span>
          </div>

          {/* Severity filter */}
          <select
            value={filters.severity}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, severity: e.target.value as AnalyticsFilterState['severity'] }))
            }
            className="bg-surface-raised border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs text-fg font-medium focus:outline-hidden focus:border-accent-blue"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="Urgent">Urgent Only</option>
            <option value="Routine">Routine Only</option>
          </select>

          {/* Emergency Type filter */}
          <select
            value={filters.emergencyType}
            onChange={(e) => setFilters((prev) => ({ ...prev, emergencyType: e.target.value }))}
            className="bg-surface-raised border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs text-fg font-medium focus:outline-hidden focus:border-accent-blue max-w-[180px] truncate"
          >
            <option value="ALL">All Emergency Types</option>
            {uniqueEmergencyTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Ambulance filter */}
          <select
            value={filters.ambulanceId}
            onChange={(e) => setFilters((prev) => ({ ...prev, ambulanceId: e.target.value }))}
            className="bg-surface-raised border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs text-fg font-medium focus:outline-hidden focus:border-accent-blue"
          >
            <option value="ALL">All Ambulances</option>
            {ambulanceFleet.map((amb) => (
              <option key={amb.id} value={amb.id}>
                {amb.id} ({amb.capability})
              </option>
            ))}
          </select>

          {/* Hospital filter */}
          <select
            value={filters.hospitalId}
            onChange={(e) => setFilters((prev) => ({ ...prev, hospitalId: e.target.value }))}
            className="bg-surface-raised border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs text-fg font-medium focus:outline-hidden focus:border-accent-blue max-w-[200px] truncate"
          >
            <option value="ALL">All Receiving Hospitals</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          {/* Dispatch Status */}
          <select
            value={filters.dispatchStatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, dispatchStatus: e.target.value }))}
            className="bg-surface-raised border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs text-fg font-medium focus:outline-hidden focus:border-accent-blue"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="ACTIVE">Active (In Transit / Scene)</option>
            <option value="AWAITING">Awaiting Dispatch</option>
          </select>
        </div>

        {/* Clear Filters */}
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-fg-muted hover:text-fg hover:bg-surface-raised transition-all border border-transparent hover:border-border-subtle"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>CLEAR FILTERS</span>
        </button>
      </div>

      {/* =========================================================================
          3. TOP KPI ROW (5-6 High Value Metric Cards with Tooltips)
          ========================================================================= */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Active / Completed Emergencies */}
        <div className="relative rounded-xl border border-border-subtle bg-surface shadow-card p-4 flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Incidents</span>
            <div className="relative cursor-pointer" onMouseEnter={() => setActiveTooltip('incidents')} onMouseLeave={() => setActiveTooltip(null)}>
              <Info className="w-3.5 h-3.5 text-fg-muted hover:text-fg" />
              {activeTooltip === 'incidents' && (
                <div className="absolute right-0 top-5 w-48 p-2 rounded-lg bg-surface-raised border border-border shadow-elevated text-[11px] text-fg z-30 pointer-events-none">
                  Total emergency call volume within the selected period, split between in-progress and completed calls.
                </div>
              )}
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-fg">
              {report.activeEmergenciesCount} <span className="text-fg-faint text-base font-normal">/</span> {report.completedEmergenciesCount}
            </div>
            <p className="text-[11px] text-fg-muted mt-0.5">Active / Completed</p>
          </div>
          <div className="text-[10px] font-mono text-fg-faint border-t border-border-subtle pt-2">
            Total in range: <span className="text-fg font-semibold">{report.totalEmergencies}</span>
          </div>
        </div>

        {/* KPI 2: Average Response Time */}
        <div className="relative rounded-xl border border-border-subtle bg-surface shadow-card p-4 flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Response Time</span>
            <div className="relative cursor-pointer" onMouseEnter={() => setActiveTooltip('respTime')} onMouseLeave={() => setActiveTooltip(null)}>
              <Info className="w-3.5 h-3.5 text-fg-muted hover:text-fg" />
              {activeTooltip === 'respTime' && (
                <div className="absolute right-0 top-5 w-52 p-2 rounded-lg bg-surface-raised border border-border shadow-elevated text-[11px] text-fg z-30 pointer-events-none">
                  Time elapsed from emergency call registration to ambulance arrival at the patient scene.
                </div>
              )}
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-status-available">
              {formatMinutesSeconds(report.responseTime.averageMinutes)}
            </div>
            <p className="text-[11px] text-fg-muted mt-0.5">
              Median: <span className="font-mono font-medium text-fg">{formatMinutesSeconds(report.responseTime.medianMinutes)}</span>
            </p>
          </div>
          <div className="text-[10px] font-mono text-fg-faint border-t border-border-subtle pt-2 flex items-center justify-between">
            <span>P90:</span>
            <span className="text-fg font-medium">
              {report.responseTime.hasEnoughDataForP90
                ? formatMinutesSeconds(report.responseTime.p90Minutes)
                : 'Insufficient data'}
            </span>
          </div>
        </div>

        {/* KPI 3: Average Dispatch Time */}
        <div className="relative rounded-xl border border-border-subtle bg-surface shadow-card p-4 flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Dispatch Duration</span>
            <div className="relative cursor-pointer" onMouseEnter={() => setActiveTooltip('dispTime')} onMouseLeave={() => setActiveTooltip(null)}>
              <Info className="w-3.5 h-3.5 text-fg-muted hover:text-fg" />
              {activeTooltip === 'dispTime' && (
                <div className="absolute right-0 top-5 w-52 p-2 rounded-lg bg-surface-raised border border-border shadow-elevated text-[11px] text-fg z-30 pointer-events-none">
                  Time from CAD call intake to dispatcher authorization and vehicle dispatch signal.
                </div>
              )}
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-accent-blue">
              {formatMinutesSeconds(report.dispatchTime.averageMinutes)}
            </div>
            <p className="text-[11px] text-fg-muted mt-0.5">
              Median: <span className="font-mono font-medium text-fg">{formatMinutesSeconds(report.dispatchTime.medianMinutes)}</span>
            </p>
          </div>
          <div className="text-[10px] font-mono text-fg-faint border-t border-border-subtle pt-2 flex items-center justify-between">
            <span>Sample size:</span>
            <span className="text-fg font-medium">{report.dispatchTime.sampleCount} calls</span>
          </div>
        </div>

        {/* KPI 4: ETA Accuracy */}
        <div className="relative rounded-xl border border-border-subtle bg-surface shadow-card p-4 flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">ETA Accuracy</span>
            <div className="relative cursor-pointer" onMouseEnter={() => setActiveTooltip('etaAcc')} onMouseLeave={() => setActiveTooltip(null)}>
              <Info className="w-3.5 h-3.5 text-fg-muted hover:text-fg" />
              {activeTooltip === 'etaAcc' && (
                <div className="absolute right-0 top-5 w-52 p-2 rounded-lg bg-surface-raised border border-border shadow-elevated text-[11px] text-fg z-30 pointer-events-none">
                  Difference between predicted travel time and recorded actual arrival duration: |Predicted ETA - Actual Arrival|.
                </div>
              )}
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-fg">
              {report.etaAccuracy.hasData ? `${report.etaAccuracy.percentWithin5Min}%` : '—'}
            </div>
            <p className="text-[11px] text-fg-muted mt-0.5">
              {report.etaAccuracy.hasData ? 'Within ±5 min window' : 'Insufficient data'}
            </p>
          </div>
          <div className="text-[10px] font-mono text-fg-faint border-t border-border-subtle pt-2 flex items-center justify-between">
            <span>Avg error:</span>
            <span className="text-fg font-medium">
              {report.etaAccuracy.hasData ? `±${report.etaAccuracy.averageErrorMinutes}m` : 'N/A'}
            </span>
          </div>
        </div>

        {/* KPI 5: Fleet Utilisation */}
        <div className="relative rounded-xl border border-border-subtle bg-surface shadow-card p-4 flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Fleet Utilisation</span>
            <div className="relative cursor-pointer" onMouseEnter={() => setActiveTooltip('fleetUtil')} onMouseLeave={() => setActiveTooltip(null)}>
              <Info className="w-3.5 h-3.5 text-fg-muted hover:text-fg" />
              {activeTooltip === 'fleetUtil' && (
                <div className="absolute right-0 top-5 w-52 p-2 rounded-lg bg-surface-raised border border-border shadow-elevated text-[11px] text-fg z-30 pointer-events-none">
                  Proportion of regional fleet actively deployed on dispatches, corridor transit, and hospital transfers.
                </div>
              )}
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-status-enroute">
              {report.fleetUtilisation.utilisationPercent}%
            </div>
            <p className="text-[11px] text-fg-muted mt-0.5">
              Active: <span className="font-mono font-medium text-fg">{report.fleetUtilisation.activeUnitsCount} of {report.fleetUtilisation.totalUnitsCount}</span> units
            </p>
          </div>
          <div className="text-[10px] font-mono text-fg-faint border-t border-border-subtle pt-2 flex items-center justify-between">
            <span>Available:</span>
            <span className="text-status-available font-semibold">{report.fleetUtilisation.statusBreakdown.available} ready</span>
          </div>
        </div>

        {/* KPI 6: Hospital Handover Time */}
        <div className="relative rounded-xl border border-border-subtle bg-surface shadow-card p-4 flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Hospital Handover</span>
            <div className="relative cursor-pointer" onMouseEnter={() => setActiveTooltip('handover')} onMouseLeave={() => setActiveTooltip(null)}>
              <Info className="w-3.5 h-3.5 text-fg-muted hover:text-fg" />
              {activeTooltip === 'handover' && (
                <div className="absolute right-0 top-5 w-52 p-2 rounded-lg bg-surface-raised border border-border shadow-elevated text-[11px] text-fg z-30 pointer-events-none">
                  Time from ambulance arrival at emergency intake bay to clinical nurse sign-off and vehicle release.
                </div>
              )}
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono tracking-tight text-fg">
              {report.hospitalCoordination.hasData ? formatMinutesSeconds(report.hospitalCoordination.avgHandoverMinutes) : '—'}
            </div>
            <p className="text-[11px] text-fg-muted mt-0.5">
              {report.hospitalCoordination.hasData ? 'Average ED bay delay' : 'Insufficient data'}
            </p>
          </div>
          <div className="text-[10px] font-mono text-fg-faint border-t border-border-subtle pt-2 flex items-center justify-between">
            <span>Clinical target:</span>
            <span className="text-status-available font-semibold">&lt; 05:00</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. EMERGENCY VOLUME TIME-SERIES CHART
          ========================================================================= */}
      <section className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-red" />
              Emergency Volume Distribution
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              Call frequency across regional sectors broken down by triage urgency tier
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-accent-red" />
                <span className="text-fg-muted text-[11px]">Critical</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-accent-amber" />
                <span className="text-fg-muted text-[11px]">Urgent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-accent-blue" />
                <span className="text-fg-muted text-[11px]">Routine</span>
              </div>
            </div>

            {/* Grouping switch */}
            <div className="inline-flex items-center p-0.5 bg-surface-raised rounded-lg border border-border-subtle text-xs font-semibold">
              {(['Hourly', 'Daily', 'Weekly'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setVolumeGrouping(g)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    volumeGrouping === g ? 'bg-surface text-fg shadow-xs font-bold' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Volume Bars */}
        {report.volumeTimeSeries.length === 0 ? (
          <div className="py-12 text-center text-xs text-fg-muted">
            No incidents recorded for the selected filter parameters.
          </div>
        ) : (
          <div className="pt-4">
            {(() => {
              const maxTotal = Math.max(...report.volumeTimeSeries.map((p) => p.total), 1);

              return (
                <div>
                  <div className="flex items-end justify-between gap-2 h-44 px-2">
                    {report.volumeTimeSeries.map((point, idx) => {
                      const totalHeight = Math.max(Math.round((point.total / maxTotal) * 100), point.total > 0 ? 8 : 2);
                      const critPct = point.total > 0 ? (point.critical / point.total) * 100 : 0;
                      const urgPct = point.total > 0 ? (point.urgent / point.total) * 100 : 0;
                      const routPct = point.total > 0 ? (point.routine / point.total) * 100 : 0;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          {/* Hover Tooltip Pill */}
                          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20 bottom-full mb-2 flex flex-col items-center whitespace-nowrap">
                            <div className="px-2.5 py-1.5 rounded-lg bg-surface-raised text-fg border border-border shadow-elevated text-[11px] space-y-0.5">
                              <p className="font-bold text-fg font-mono border-b border-border-subtle pb-1">
                                {point.label}: {point.total} call{point.total !== 1 ? 's' : ''}
                              </p>
                              <div className="text-[10px] space-y-0.5 pt-0.5 font-mono">
                                <div className="text-accent-red">Critical: {point.critical}</div>
                                <div className="text-accent-amber">Urgent: {point.urgent}</div>
                                <div className="text-accent-blue">Routine: {point.routine}</div>
                              </div>
                            </div>
                          </div>

                          {/* Stacked Bar */}
                          <div
                            style={{ height: `${totalHeight}%` }}
                            className="w-full max-w-[40px] rounded-t-sm flex flex-col overflow-hidden transition-all duration-200 group-hover:brightness-110"
                          >
                            {point.critical > 0 && <div style={{ height: `${critPct}%` }} className="bg-accent-red w-full" />}
                            {point.urgent > 0 && <div style={{ height: `${urgPct}%` }} className="bg-accent-amber w-full" />}
                            {point.routine > 0 && <div style={{ height: `${routPct}%` }} className="bg-accent-blue w-full" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="h-px w-full bg-border-subtle mt-2" />

                  {/* Labels */}
                  <div className="flex items-center justify-between gap-2 px-2 mt-2">
                    {report.volumeTimeSeries.map((point, idx) => (
                      <span key={idx} className="flex-1 text-center text-[10px] font-mono text-fg-muted truncate">
                        {point.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </section>

      {/* =========================================================================
          5. TWO-COLUMN: RESPONSE VELOCITY & ETA CORRELATION
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Response Velocity Profile */}
        <section className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-status-available" />
                Response Velocity Profile
              </h2>
              <span className="text-xs font-mono font-bold text-status-available">
                {formatMinutesSeconds(report.responseTime.averageMinutes)} Avg
              </span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">
              Breakdown between CAD dispatch verification and road corridor travel velocity
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 my-6">
            <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-center">
              <span className="text-xs text-fg-muted font-medium block">Average</span>
              <span className="text-xl font-bold font-mono text-fg mt-1 block">
                {formatMinutesSeconds(report.responseTime.averageMinutes)}
              </span>
              <span className="text-[10px] text-fg-faint block mt-0.5">Overall mean</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-center">
              <span className="text-xs text-fg-muted font-medium block">Median</span>
              <span className="text-xl font-bold font-mono text-accent-blue mt-1 block">
                {formatMinutesSeconds(report.responseTime.medianMinutes)}
              </span>
              <span className="text-[10px] text-fg-faint block mt-0.5">50th percentile</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-center">
              <span className="text-xs text-fg-muted font-medium block">P90</span>
              <span className="text-xl font-bold font-mono text-accent-amber mt-1 block">
                {report.responseTime.hasEnoughDataForP90
                  ? formatMinutesSeconds(report.responseTime.p90Minutes)
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-fg-faint block mt-0.5">90th percentile</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-xs text-fg-muted space-y-1">
            <div className="flex items-center justify-between">
              <span>Phase 1: Dispatch Intake Duration</span>
              <span className="font-mono font-bold text-fg">{formatMinutesSeconds(report.dispatchTime.averageMinutes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Phase 2: Corridor Travel to Scene</span>
              <span className="font-mono font-bold text-fg">
                {report.responseTime.averageMinutes && report.dispatchTime.averageMinutes
                  ? formatMinutesSeconds(Math.max(0, report.responseTime.averageMinutes - report.dispatchTime.averageMinutes))
                  : '—'}
              </span>
            </div>
          </div>
        </section>

        {/* Right Column: ETA Accuracy & Traffic Analysis */}
        <section className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
                <Target className="w-4 h-4 text-status-enroute" />
                ETA Prediction Accuracy & Traffic
              </h2>
              <span className="text-xs font-mono font-bold text-fg">
                {report.etaAccuracy.hasData ? `±${report.etaAccuracy.averageErrorMinutes}m Avg Error` : 'Low sample'}
              </span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">
              Engine predicted arrival duration vs actual verified GPS scene arrival
            </p>
          </div>

          {report.etaAccuracy.hasData ? (
            <div className="space-y-4 my-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-center">
                  <span className="text-xs text-fg-muted block">Within ±5 Minutes</span>
                  <span className="text-2xl font-bold font-mono text-status-available mt-1 block">
                    {report.etaAccuracy.percentWithin5Min}%
                  </span>
                  <span className="text-[10px] text-fg-faint block">High confidence window</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-center">
                  <span className="text-xs text-fg-muted block">Within ±10 Minutes</span>
                  <span className="text-2xl font-bold font-mono text-accent-blue mt-1 block">
                    {report.etaAccuracy.percentWithin10Min}%
                  </span>
                  <span className="text-[10px] text-fg-faint block">Acceptable tolerance</span>
                </div>
              </div>

              {/* Traffic heuristic correlation */}
              <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle space-y-2 text-xs">
                <span className="font-semibold text-fg-muted uppercase text-[10px] tracking-wider block">
                  Observed Travel Duration by Corridor Traffic Tier:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 rounded bg-surface border border-border-subtle">
                    <span className="text-[10px] text-status-available block">Light</span>
                    <span className="font-bold text-fg text-sm">
                      {report.trafficPerformance.light.avgEta ? `${report.trafficPerformance.light.avgEta}m` : '—'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-border-subtle">
                    <span className="text-[10px] text-accent-amber block">Moderate</span>
                    <span className="font-bold text-fg text-sm">
                      {report.trafficPerformance.moderate.avgEta ? `${report.trafficPerformance.moderate.avgEta}m` : '—'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-border-subtle">
                    <span className="text-[10px] text-accent-red block">Heavy</span>
                    <span className="font-bold text-fg text-sm">
                      {report.trafficPerformance.heavy.avgEta ? `${report.trafficPerformance.heavy.avgEta}m` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-fg-muted">
              ETA accuracy will appear after completed trips with recorded arrival times exist.
            </div>
          )}

          <p className="text-[11px] text-fg-faint">
            Evaluated across {report.etaAccuracy.completedTripCount} completed transit trips in range.
          </p>
        </section>
      </div>

      {/* =========================================================================
          6. DISPATCH ENGINE ANALYTICS & OVERRIDES
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendation Acceptance */}
        <section className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-blue" />
              Dispatch Engine Recommendation Behaviour
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              Proportion of cases where dispatchers accepted the AI algorithmic rank #1 candidate
            </p>
          </div>

          <div className="my-6 flex items-center justify-center gap-8">
            <div className="text-center">
              <span className="text-3xl font-extrabold font-mono text-status-available">
                {report.recommendation.acceptanceRate}%
              </span>
              <span className="text-xs text-fg-muted block mt-1">
                Accepted ({report.recommendation.acceptedCount})
              </span>
            </div>
            <div className="w-px h-12 bg-border-subtle" />
            <div className="text-center">
              <span className="text-3xl font-extrabold font-mono text-accent-amber">
                {report.recommendation.overrideRate}%
              </span>
              <span className="text-xs text-fg-muted block mt-1">
                Manual Override ({report.recommendation.overriddenCount})
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle text-xs text-fg-muted leading-relaxed">
            <span className="font-semibold text-fg">Operational Note: </span>
            A lower override rate is not inherently superior. Dispatcher overrides reflect operational judgment, unmapped roadblocks, or regional crew familiarity.
          </div>
        </section>

        {/* Override Reasons Breakdown */}
        <section className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent-amber" />
              Primary Manual Override Drivers
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              Documented rationales recorded by dispatchers during manual candidate re-selection
            </p>
          </div>

          <div className="my-4 space-y-2.5">
            {report.recommendation.commonOverrideReasons.length === 0 ? (
              <p className="text-xs text-fg-muted py-6 text-center">
                No manual overrides recorded within the selected period.
              </p>
            ) : (
              report.recommendation.commonOverrideReasons.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-surface-raised border border-border-subtle text-xs flex items-center justify-between">
                  <span className="font-medium text-fg truncate max-w-[280px]" title={item.reason}>
                    {item.reason}
                  </span>
                  <div className="flex items-center gap-2 font-mono flex-shrink-0">
                    <span className="text-fg-muted">{item.count} case{item.count > 1 ? 's' : ''}</span>
                    <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-accent-amber font-bold">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="text-[11px] text-fg-faint">
            Total decisions evaluated: {report.recommendation.totalEvaluated}
          </p>
        </section>
      </div>

      {/* =========================================================================
          7. FLEET PERFORMANCE & UTILISATION TABLE
          ========================================================================= */}
      <section className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
              <Truck className="w-4 h-4 text-accent-blue" />
              Ambulance Vehicle Performance
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              Unit-level operational transit metrics, trip volume, and prediction deviation
            </p>
          </div>

          <div className="text-xs text-fg-muted font-mono">
            Click column headers to sort
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-raised border-b border-border-subtle font-semibold text-fg-muted uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Unit ID</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Capability</th>
                <th className="p-3">Status</th>
                <th
                  onClick={() => handleSort('trips')}
                  className="p-3 cursor-pointer hover:text-fg transition-colors"
                >
                  Trips {sortField === 'trips' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('avgResponseMinutes')}
                  className="p-3 cursor-pointer hover:text-fg transition-colors"
                >
                  Avg Response {sortField === 'avgResponseMinutes' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('avgEtaErrorMinutes')}
                  className="p-3 cursor-pointer hover:text-fg transition-colors"
                >
                  Avg ETA Error {sortField === 'avgEtaErrorMinutes' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => handleSort('completedIncidents')}
                  className="p-3 cursor-pointer hover:text-fg transition-colors"
                >
                  Completed {sortField === 'completedIncidents' && (sortAsc ? '▲' : '▼')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-mono text-xs">
              {sortedFleet.map((amb) => (
                <tr key={amb.ambulanceId} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="p-3 font-bold text-fg">{amb.ambulanceId}</td>
                  <td className="p-3 font-sans text-fg-muted">{amb.driverName}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-surface-raised border border-border-subtle text-fg">
                      {amb.capability}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-sans font-medium ${
                        amb.currentStatus === 'AVAILABLE'
                          ? 'text-status-available'
                          : amb.currentStatus === 'EN_ROUTE'
                          ? 'text-status-enroute'
                          : 'text-fg-muted'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          amb.currentStatus === 'AVAILABLE'
                            ? 'bg-status-available'
                            : amb.currentStatus === 'EN_ROUTE'
                            ? 'bg-status-enroute'
                            : 'bg-fg-faint'
                        }`}
                      />
                      {amb.currentStatus}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-fg">{amb.trips}</td>
                  <td className="p-3 text-status-available font-bold">
                    {amb.avgResponseMinutes !== null ? `${amb.avgResponseMinutes}m` : '—'}
                  </td>
                  <td className="p-3 text-fg-muted">
                    {amb.avgEtaErrorMinutes !== null ? `±${amb.avgEtaErrorMinutes}m` : '—'}
                  </td>
                  <td className="p-3 text-fg">{amb.completedIncidents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* =========================================================================
          8. HOSPITAL COORDINATION & OUTCOMES FUNNEL
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hospital Coordination Milestones */}
        <section className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent-blue" />
              Hospital Emergency Coordination
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              Operational durations across receiving trauma centers and acute triage teams
            </p>
          </div>

          <div className="my-6 space-y-3">
            <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle flex items-center justify-between">
              <div>
                <span className="font-semibold text-fg text-xs block">Pre-Alert Formulation</span>
                <span className="text-[11px] text-fg-muted">Dispatch $\rightarrow$ Pre-Alert Transmitted</span>
              </div>
              <span className="font-mono font-bold text-sm text-fg">
                {report.hospitalCoordination.hasData
                  ? formatMinutesSeconds(report.hospitalCoordination.avgPreAlertMinutes)
                  : '—'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle flex items-center justify-between">
              <div>
                <span className="font-semibold text-fg text-xs block">ED Acknowledgement</span>
                <span className="text-[11px] text-fg-muted">Sent $\rightarrow$ Trauma bay confirmed</span>
              </div>
              <span className="font-mono font-bold text-sm text-status-available">
                {report.hospitalCoordination.hasData
                  ? formatMinutesSeconds(report.hospitalCoordination.avgAckMinutes)
                  : '—'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-raised border border-border-subtle flex items-center justify-between">
              <div>
                <span className="font-semibold text-fg text-xs block">Clinical Handover Duration</span>
                <span className="text-[11px] text-fg-muted">Ambulance intake bay arrival $\rightarrow$ Nurse sign-off</span>
              </div>
              <span className="font-mono font-bold text-sm text-accent-amber">
                {report.hospitalCoordination.hasData
                  ? formatMinutesSeconds(report.hospitalCoordination.avgHandoverMinutes)
                  : '—'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-fg-faint">
            Based on {report.hospitalCoordination.completedHandoverCount} completed clinical handovers in range.
          </p>
        </section>

        {/* Incident Outcomes Funnel */}
        <section className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Incident Outcomes Lifecycle Funnel
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              Step-by-step operational progression from initial caller ring to emergency closure
            </p>
          </div>

          <div className="my-4 space-y-2">
            {report.outcomesFunnel.map((step, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-fg flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-surface-raised border border-border-subtle text-[10px] flex items-center justify-center text-fg-muted font-mono">
                      {idx + 1}
                    </span>
                    {step.stage}
                  </span>
                  <span className="font-mono font-bold text-fg">
                    {step.count} ({step.conversionPercent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                  <div
                    style={{ width: `${step.conversionPercent}%` }}
                    className="h-full bg-accent-blue rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-fg-faint">
            Identifies stage friction or operational bottlenecks in active regional dispatch.
          </p>
        </section>
      </div>

      {/* =========================================================================
          9. CRITICAL INCIDENT OPERATIONAL MONITORING
          ========================================================================= */}
      <section className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2 text-accent-red font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Priority Tier Focus: Critical Cases</span>
          </div>
          <h2 className="text-base font-bold text-fg">High-Acuity Emergency Telemetry</h2>
          <p className="text-xs text-fg-muted leading-relaxed">
            Strict operational velocity metrics for Tier 1 cardiac, stroke, and polytrauma emergencies. RapidRoute tracks operational velocity only and does not infer medical or patient outcomes.
          </p>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle text-center min-w-[110px]">
            <span className="text-[11px] text-fg-muted block font-medium">Total Critical</span>
            <span className="text-2xl font-bold font-mono text-accent-red mt-0.5 block">
              {report.criticalMonitoring.totalCritical}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle text-center min-w-[110px]">
            <span className="text-[11px] text-fg-muted block font-medium">Avg Dispatch</span>
            <span className="text-2xl font-bold font-mono text-accent-blue mt-0.5 block">
              {formatMinutesSeconds(report.criticalMonitoring.avgCriticalDispatchMinutes)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border-subtle text-center min-w-[110px]">
            <span className="text-[11px] text-fg-muted block font-medium">Avg Response</span>
            <span className="text-2xl font-bold font-mono text-status-available mt-0.5 block">
              {formatMinutesSeconds(report.criticalMonitoring.avgCriticalResponseMinutes)}
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. AUDIT NOTICE FOOTER
          ========================================================================= */}
      <div className="p-4 rounded-xl bg-surface-raised border border-border-subtle flex items-center justify-between gap-4 text-xs text-fg-muted">
        <div className="flex items-center gap-3">
          <Info className="w-4 h-4 text-accent-blue flex-shrink-0" />
          <span>
            {report.dataSourceLabel === 'Connected Mode (Supabase)'
              ? 'Operational analytics live-synced from connected Supabase PostgreSQL dispatch records.'
              : 'Operating on simulated CAD prototype data for regional hackathon demonstration. All calculations derive from persistent repository records.'}
          </span>
        </div>

        <button
          onClick={handleExport}
          className="text-xs font-semibold text-accent-blue hover:underline whitespace-nowrap flex items-center gap-1"
        >
          <span>Download Audit CSV</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
