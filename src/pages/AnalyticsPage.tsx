import { useState } from 'react';
import {
  Clock,
  Zap,
  Activity,
  Target,
  Info,
} from 'lucide-react';
import {
  MetricCard,
  PageHero,
  CapacityMeter,
} from '../components/ui';
import type { AnalyticsDataPoint } from '../types';
import {
  mockResponseTimeData,
  mockDispatchTimeData,
  mockUtilisationData,
  mockVolumeData,
} from '../data/mockData';

interface BarChartProps {
  data: AnalyticsDataPoint[];
  barColor: string;
  unit?: string;
}

function BarChart({ data, barColor, unit = '' }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full pt-6">
      {/* Bars container */}
      <div className="flex items-end justify-between gap-3 h-[130px] px-1">
        {data.map((item, index) => {
          const heightPercent = Math.max(Math.round((item.value / maxValue) * 100), 6);

          return (
            <div
              key={`${item.label}-${index}`}
              className="group relative flex-1 flex flex-col items-center justify-end h-full cursor-default"
            >
              {/* Value label pill on hover */}
              <div
                className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10 flex flex-col items-center"
                style={{ bottom: `calc(${heightPercent}% + 8px)` }}
              >
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-surface-raised text-fg border border-border shadow-elevated whitespace-nowrap">
                  {item.value}
                  {unit}
                </span>
              </div>

              {/* Bar with rounded top and subtle hover glow */}
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full max-w-[36px] rounded-t-md transition-all duration-200 group-hover:brightness-110 ${barColor}`}
              />
            </div>
          );
        })}
      </div>

      {/* Baseline divider */}
      <div className="h-px w-full bg-border-subtle mt-1.5" />

      {/* Labels */}
      <div className="flex items-center justify-between gap-3 px-1 mt-2.5">
        {data.map((item, index) => (
          <span
            key={`label-${item.label}-${index}`}
            className="flex-1 text-center text-xs font-semibold text-fg-muted"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const timeRanges = ['Today', '7 Days', '30 Days', '90 Days'] as const;
  type TimeRange = (typeof timeRanges)[number];

  const [selectedRange, setSelectedRange] = useState<TimeRange>('7 Days');

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* 1. PAGE HERO */}
      <PageHero
        category="Performance Benchmarking"
        title="Operational Analytics"
        description="Historical and real-time operational metrics covering dispatch delay, transit arrival accuracy, fleet utilisation, and clinical ER handover times."
        telemetryStatus="ANALYTICS ENGINE"
        telemetryDot="blue"
        action={
          <div className="inline-flex items-center p-1 bg-surface rounded-xl border border-border shadow-card">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedRange === range
                    ? 'bg-surface-overlay text-fg shadow-xs'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        }
      />

      {/* 2. TOP METRICS ROW */}
      <section aria-label="Executive Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          label="Average Response Time"
          value="8m 42s"
          icon={<Clock className="w-5 h-5 text-status-available" />}
          subtitle="Call intake to patient arrival"
          trend="1m 14s vs benchmark"
          trendUp
          accentColor="green"
          variant="primary"
        />
        <MetricCard
          label="Average Dispatch Delay"
          value="2m 11s"
          icon={<Zap className="w-5 h-5 text-accent-blue" />}
          subtitle="CAD verification to wheel roll"
          trend="32s faster"
          trendUp
          accentColor="blue"
          variant="primary"
        />
        <MetricCard
          label="ETA Prediction Accuracy"
          value="94.2%"
          icon={<Target className="w-5 h-5 text-status-enroute" />}
          subtitle="Arrival within ±2m window"
          trend="+2.1% this week"
          trendUp
          accentColor="amber"
          variant="secondary"
        />
        <MetricCard
          label="Total Incident Volume"
          value="263"
          icon={<Activity className="w-5 h-5 text-accent-red" />}
          subtitle="Past 7 days resolved"
          accentColor="red"
          variant="secondary"
        />
      </section>

      {/* 3. CHARTS GRID (High Visual Depth) */}
      <section aria-label="Performance Visualizations" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Chart 1: Average Response Time */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-fg tracking-tight">Average Response Time</h3>
              <span className="text-xs font-mono font-bold text-status-available">8.42m Avg</span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">Average minutes across all tricity priority tiers</p>
          </div>
          <BarChart data={mockResponseTimeData} barColor="bg-accent-blue" unit="m" />
        </div>

        {/* Chart 2: Dispatch Authorization Time */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-fg tracking-tight">Dispatch Intake Duration</h3>
              <span className="text-xs font-mono font-bold text-accent-blue">2.19m Avg</span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">Time from 112 ring to ambulance alert</p>
          </div>
          <BarChart data={mockDispatchTimeData} barColor="bg-status-available" unit="m" />
        </div>

        {/* Chart 3: Fleet Utilisation */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-fg tracking-tight">Fleet Utilisation</h3>
              <span className="text-xs font-mono font-bold text-status-enroute">74% Avg</span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">Percentage of network vehicles actively deployed</p>
          </div>
          <BarChart data={mockUtilisationData} barColor="bg-status-enroute" unit="%" />
        </div>

        {/* Chart 4: Daily Emergency Volume */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-fg tracking-tight">Daily Emergency Volume</h3>
              <span className="text-xs font-mono font-bold text-accent-red">37 / Day</span>
            </div>
            <p className="text-xs text-fg-muted mt-0.5">Triage call distribution across regional sectors</p>
          </div>
          <BarChart data={mockVolumeData} barColor="bg-accent-red" />
        </div>

        {/* KPI Focus Card 5: ETA Accuracy */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-fg tracking-tight">ETA Prediction Accuracy</h3>
            <p className="text-xs text-fg-muted mt-0.5">Predicted arrival vs actual GPS timestamp</p>
          </div>
          <div className="my-6 text-center space-y-2">
            <span className="text-5xl font-extrabold font-sans text-fg tracking-tight">
              94.2%
            </span>
            <p className="text-xs text-status-available font-semibold">
              +2.1% improvement with real-time corridor heuristic
            </p>
          </div>
          <div className="pt-3 border-t border-border-subtle text-xs text-fg-muted flex items-center justify-between font-medium">
            <span>Target Benchmark</span>
            <span className="font-mono text-fg font-bold">90.0% Minimum</span>
          </div>
        </div>

        {/* KPI Focus Card 6: Hospital Handover Time */}
        <div className="rounded-xl border border-border-subtle bg-surface shadow-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-fg tracking-tight">Hospital Handover Time</h3>
            <p className="text-xs text-fg-muted mt-0.5">Ambulance bay arrival to clinical nurse sign-off</p>
          </div>
          <div className="my-6 space-y-3">
            <div className="text-center">
              <span className="text-4xl font-extrabold font-sans text-fg">4.8 min</span>
              <span className="text-xs text-fg-faint block mt-0.5">Avg ER intake delay</span>
            </div>
            <CapacityMeter value={4.8} max={5.0} color="green" size="md" />
          </div>
          <div className="pt-3 border-t border-border-subtle text-xs text-fg-muted flex items-center justify-between font-medium">
            <span>Clinical SLA Target</span>
            <span className="font-mono text-fg font-bold">&lt; 5.0 Minutes</span>
          </div>
        </div>
      </section>

      {/* Notice Banner */}
      <div className="p-4 rounded-xl bg-surface-raised border border-border-subtle flex items-center gap-3 text-xs text-fg-muted">
        <Info className="w-4 h-4 text-accent-blue flex-shrink-0" />
        <span>
          Analytics data shown above is simulated based on historical tricity emergency operations. Telemetry export available for regional audit.
        </span>
      </div>
    </div>
  );
}
