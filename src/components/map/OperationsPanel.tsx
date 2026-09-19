import React, { useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  Send,
  ShieldCheck,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import type {
  ActiveEmergency,
  Hospital,
  DispatchRecommendation,
} from '../../types';
import type { RouteGeometry, LatLngTuple } from '../../map/mapTypes';
import { StatusPill, Button } from '../ui';
import { DemoTelemetryController } from './DemoTelemetryController';
import { explainDispatchRecommendation } from '../../ai/aiService';

interface OperationsPanelProps {
  emergencies: ActiveEmergency[];
  selectedIncident: ActiveEmergency;
  onSelectIncident: (id: string) => void;
  recommendation: DispatchRecommendation | null;
  recommendedHospital: Hospital | null;
  routes: RouteGeometry[];
  onDispatch: (ambulanceId: string) => void;
  simulatedAmbulancePos?: LatLngTuple | null;
  onPositionUpdate: (pos: LatLngTuple | null, progress: number) => void;
}

export const OperationsPanel: React.FC<OperationsPanelProps> = ({
  emergencies,
  selectedIncident,
  onSelectIncident,
  recommendation,
  recommendedHospital,
  routes,
  onDispatch,
  onPositionUpdate,
}) => {
  const isAwaitingDispatch = selectedIncident.status === 'Awaiting Dispatch';
  const isDispatchedOrEnRoute =
    selectedIncident.status === 'Dispatched' ||
    selectedIncident.status === 'En Route' ||
    selectedIncident.assignedAmbulance !== null;

  const assignedAmbulanceId =
    selectedIncident.assignedAmbulance || recommendation?.recommendedAmbulanceId;

  // Active route for telemetry (recommended or assigned)
  const activeTelemetryRoute =
    routes.find((r) => r.originId === assignedAmbulanceId) || routes[0] || null;

  // AI natural-language explanation grounded in engine facts
  const aiExplanation = useMemo(() => {
    if (!recommendation || !selectedIncident) return null;
    const runnerUp =
      recommendation.eligibleCandidates.find(
        (c) => c.ambulance.id !== recommendation.recommendedAmbulanceId
      ) || null;

    return explainDispatchRecommendation({
      recommendation,
      incidentLocation: selectedIncident.location,
      incidentCategory: selectedIncident.emergencyType,
      incidentSeverity: selectedIncident.severity,
      requiredCapability: selectedIncident.requiredCapability,
      runnerUp,
    });
  }, [recommendation, selectedIncident]);

  return (
    <div className="space-y-4 lg:max-h-[620px] lg:overflow-y-auto lg:pr-1.5 scrollbar-thin">
      {/* 1. INCIDENT SELECTOR & STATUS */}
      <div className="rounded-xl border border-border bg-surface shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-red animate-ping-subtle" />
            <h3 className="text-sm font-bold text-fg tracking-tight">Active Incident</h3>
          </div>

          <select
            value={selectedIncident.id}
            onChange={(e) => onSelectIncident(e.target.value)}
            className="bg-surface-overlay border border-border rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-fg focus:outline-none focus:border-accent-blue cursor-pointer"
          >
            {emergencies.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.id} — {inc.location.split(',')[0]} ({inc.severity})
              </option>
            ))}
          </select>
        </div>

        {/* Selected Incident Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-fg">{selectedIncident.id}</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${selectedIncident.severity === 'Critical'
                    ? 'bg-red-500/10 text-accent-red border border-red-500/20'
                    : selectedIncident.severity === 'Urgent'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}
              >
                {selectedIncident.severity}
              </span>
              <StatusPill
                status={isAwaitingDispatch ? 'AWAITING' : 'EN_ROUTE'}
                size="sm"
              />
            </div>
          </div>

          <p className="text-sm font-bold text-fg leading-tight">{selectedIncident.location}</p>
          <p className="text-xs text-fg-muted">{selectedIncident.emergencyType}</p>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] bg-surface-overlay/50 p-2.5 rounded-lg border border-border-subtle font-medium">
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Req. Capability</span>
              <span className="font-mono font-bold text-accent-blue">
                {selectedIncident.requiredCapability}
              </span>
            </div>
            <div>
              <span className="text-fg-faint block text-[10px] uppercase">Reported Time</span>
              <span className="font-mono text-fg">{selectedIncident.reportedAt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AI DISPATCH RECOMMENDATION */}
      {recommendation?.recommendedAmbulance && (
        <div className="rounded-xl border border-border bg-surface shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-status-available" />
              <h3 className="text-sm font-bold text-fg tracking-tight">AI Recommendation</h3>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-status-available/10 text-status-available border border-status-available/20">
              Score: {recommendation.finalScore} / 100
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-lg bg-surface-raised border border-border">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">
                Recommended Unit
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-fg">
                  {recommendation.recommendedAmbulance.id}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-overlay text-fg-muted">
                  {recommendation.recommendedAmbulance.currentArea}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint block">
                Estimated Arrival
              </span>
              <span className="font-mono text-xl font-bold text-status-available">
                {recommendation.recommendedAmbulance.etaMinutes} MIN
              </span>
            </div>
          </div>

          {/* Explainability Rationale */}
          <div className="space-y-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted block">
              Why this unit is recommended:
            </span>
            <div className="space-y-1.5">
              {recommendation.reasons.map((r, idx) => (
                <div key={idx} className="flex items-start gap-2 text-fg-muted leading-tight">
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-available flex-shrink-0 mt-0.5" />
                  <span className="text-[11px]">{r}</span>
                </div>
              ))}
            </div>

            {aiExplanation?.runnerUpComparison && (
              <div className="p-2.5 rounded-lg bg-surface-overlay border border-border-subtle text-[11px] text-fg-muted leading-relaxed space-y-1">
                <span className="font-bold text-[10px] uppercase text-status-enroute flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Decision Engine Comparison:
                </span>
                <p>{aiExplanation.runnerUpComparison}</p>
              </div>
            )}
          </div>

          {/* Action CTA */}
          {isAwaitingDispatch && (
            <Button
              variant="primary"
              size="md"
              onClick={() => onDispatch(recommendation.recommendedAmbulance!.id)}
              icon={<Send className="w-4 h-4" />}
              className="w-full text-xs font-bold uppercase tracking-wider py-2.5 shadow-sm"
            >
              Authorize Dispatch {recommendation.recommendedAmbulance.id}
            </Button>
          )}
        </div>
      )}

      {/* 3. VISUAL ROUTE & CANDIDATE COMPARISON (Core Promise Visualizer) */}
      <div className="rounded-xl border border-border bg-surface shadow-card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-accent-blue" />
            <h3 className="text-sm font-bold text-fg tracking-tight">Route & ETA Comparison</h3>
          </div>
          <span className="text-[10px] font-mono text-fg-muted uppercase">Fastest Wins</span>
        </div>

        {/* Informative Insight Callout */}
        <div className="p-3 rounded-lg bg-surface-raised/70 border border-border-subtle text-xs text-fg leading-relaxed">
          <p className="font-medium">
            <span className="font-bold text-status-available">Speed over Proximity:</span>{' '}
            {routes.length >= 2 ? (
              <>
                <strong className="font-mono text-fg">{routes[0].originId}</strong> ({routes[0].distanceKm} km, {routes[0].trafficCondition} traffic) arrives in{' '}
                <strong className="text-status-available">{routes[0].etaMinutes} min</strong>, beating{' '}
                <strong className="font-mono text-fg">{routes[1].originId}</strong> ({routes[1].distanceKm} km, {routes[1].trafficCondition} traffic, {routes[1].etaMinutes} min).
              </>
            ) : (
              'Real-time traffic telemetry factor determines arrival speed over simple linear distance.'
            )}
          </p>
        </div>

        {/* Route Cards */}
        <div className="space-y-2">
          {routes
            .filter((r) => !r.originId.startsWith('INC-'))
            .map((route) => {
              const isRec = route.isRecommended;
              return (
                <div
                  key={route.id}
                  className={`p-3 rounded-lg border transition-all text-xs ${isRec
                      ? 'bg-status-available/5 border-status-available/40 shadow-xs'
                      : 'bg-surface-overlay/40 border-border-subtle'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-fg">{route.originId}</span>
                      <span className="text-[10px] text-fg-muted font-medium">
                        ({route.originName})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isRec ? (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-status-available text-white">
                          ★ RECOMMENDED
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-fg-faint">
                          ALTERNATIVE
                        </span>
                      )}
                      <span
                        className={`font-mono font-bold text-sm ${isRec ? 'text-status-available' : 'text-fg-muted'
                          }`}
                      >
                        {route.etaMinutes} MIN
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-fg-muted pt-1 border-t border-border-subtle/50 font-mono">
                    <span>Distance: <strong className="text-fg">{route.distanceKm} km</strong></span>
                    <span>
                      Traffic:{' '}
                      <strong
                        className={
                          route.trafficCondition === 'Light'
                            ? 'text-status-available'
                            : route.trafficCondition === 'Heavy'
                              ? 'text-accent-red'
                              : 'text-amber-500'
                        }
                      >
                        {route.trafficCondition}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 4. DEMO TELEMETRY CONTROLLER (If Dispatched or Active) */}
      {isDispatchedOrEnRoute && activeTelemetryRoute && (
        <DemoTelemetryController
          route={activeTelemetryRoute}
          ambulanceId={assignedAmbulanceId || 'RR-204'}
          onPositionUpdate={onPositionUpdate}
        />
      )}

      {/* 5. RECEIVING HOSPITAL PRE-ALERT */}
      {recommendedHospital && (
        <div className="rounded-xl border border-border bg-surface shadow-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent-blue" />
              <h3 className="text-sm font-bold text-fg tracking-tight">Receiving Facility</h3>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-accent-blueSubtle text-accent-blue border border-accent-blue/20">
              {recommendedHospital.traumaLevel}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-surface-raised border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-fg">{recommendedHospital.name}</span>
              <StatusPill
                status={
                  selectedIncident.preAlert?.status === 'HANDOVER_COMPLETED' || selectedIncident.preAlert?.status === 'PATIENT_ARRIVED'
                    ? 'READY'
                    : selectedIncident.preAlert?.status === 'ACKNOWLEDGED' || selectedIncident.recommendedHospital?.preAlertStatus === 'Acknowledged'
                      ? 'READY'
                      : 'LIMITED'
                }
                label={selectedIncident.preAlert?.status || selectedIncident.recommendedHospital?.preAlertStatus || recommendedHospital.edStatus.toUpperCase()}
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-fg-muted font-mono">
              <span>{recommendedHospital.area} ({recommendedHospital.distanceKm} km)</span>
              <span className="font-bold text-status-available">
                {recommendedHospital.icuBedsAvailable} ICU / {recommendedHospital.emergencyBedsAvailable} ED free
              </span>
            </div>

            {selectedIncident.preAlert?.requiredPreparation && (
              <div className="pt-2 border-t border-border-subtle text-[11px]">
                <span className="text-fg-faint uppercase font-bold text-[9px] block">
                  Clinical Preparation
                </span>
                <span className="text-fg font-medium">
                  {selectedIncident.preAlert.requiredPreparation}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
