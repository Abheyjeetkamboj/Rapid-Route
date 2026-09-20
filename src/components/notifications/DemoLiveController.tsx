import { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Activity,
  ChevronUp,
  ChevronDown,
  Zap,
  Radio,
  Clock,
  CheckCircle2,
  Building2,
  Ambulance,
  Sliders,
} from 'lucide-react';
import { useDispatchContext } from '../../context/DispatchContext';
import { notificationService } from '../../realtime/notificationService';

export function DemoLiveController() {
  const {
    simulationStatus,
    startSimulation,
    pauseSimulation,
    stepSimulation,
    resetSimulation,
    loadCardiacScenario,
    triggerNewEmergency,
    simulateEtaUpdate,
    simulateHospitalAck,
    simulateAmbulanceArrival,
    simulateHandover,
    realtimeStatus,
  } = useDispatchContext();

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showManualTriggers, setShowManualTriggers] = useState<boolean>(true);

  return (
    <div className="fixed bottom-4 right-6 z-40 flex flex-col items-end print:hidden">
      <div className={`rounded-xl bg-surface/95 backdrop-blur-md border border-border shadow-elevated overflow-hidden transition-all duration-200 ${isMinimized ? 'w-auto shadow-md' : 'w-84 sm:w-96'}`}>
        {/* Top Control Bar */}
        <div className="px-3.5 py-2.5 bg-surface-raised border-b border-border-subtle flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${simulationStatus.isRunning ? 'bg-status-available animate-pulse' : 'bg-accent-blue'
                }`}
            />
            <Activity className="w-3.5 h-3.5 text-accent-blue" />
            <span className="font-bold text-fg tracking-tight">DEMO CONTROLS</span>
            <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-fg-muted font-semibold">
              {realtimeStatus === 'LIVE' ? 'LIVE SUPABASE' : 'DEMO BUS'}
            </span>
          </div>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-fg-muted hover:text-fg hover:bg-surface transition-colors"
            title={isMinimized ? 'Expand demo controls' : 'Minimize demo controls'}
            aria-label={isMinimized ? 'Expand demo controls' : 'Minimize demo controls'}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Body */}
        {!isMinimized && (
          <div className="p-3.5 space-y-3.5">
            {/* 1. Hero Scenario Quick-Trigger */}
            <div>
              <button
                onClick={() => {
                  loadCardiacScenario();
                  try {
                    if (typeof localStorage !== 'undefined') {
                      localStorage.setItem('rapidroute_citizen_active_incident_id', 'INC-8841');
                    }
                  } catch {
                    // Ignore
                  }
                }}
                className="w-full group flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-xs font-semibold text-red-600 dark:text-red-400 transition-all shadow-xs"
              >
                <div className="flex items-center gap-2 text-left">
                  <Zap className="w-3.5 h-3.5 text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-bold">LOAD CARDIAC SCENARIO (INC-8841)</div>
                    <div className="text-[10px] font-normal text-fg-muted">Chitkara Univ • RR-204 vs RR-101 • City Hospital</div>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-300">
                  Ready
                </span>
              </button>
            </div>

            {/* 2. Automated Live Simulation Progress */}
            <div className="bg-surface-raised/60 rounded-lg p-2.5 border border-border-subtle">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-fg font-mono">
                  Stage {simulationStatus.currentStage} of {simulationStatus.totalStages}: {simulationStatus.stageName}
                </span>
                <span className="text-[11px] font-mono text-fg-muted font-semibold">
                  {Math.round((simulationStatus.currentStage / simulationStatus.totalStages) * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-fg-muted mt-1 leading-relaxed">
                {simulationStatus.stageDescription}
              </p>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-surface rounded-full mt-2 overflow-hidden border border-border-subtle">
                <div
                  style={{ width: `${(simulationStatus.currentStage / simulationStatus.totalStages) * 100}%` }}
                  className="h-full bg-blue-600 bg-accent-blue rounded-full transition-all duration-300"
                />
              </div>

              {/* Automated Control Buttons */}
              <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-border-subtle">
                {simulationStatus.isRunning ? (
                  <button
                    onClick={pauseSimulation}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-xs font-semibold text-fg transition-all"
                  >
                    <Pause className="w-3.5 h-3.5 text-accent-amber" />
                    <span>Pause Live</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startSimulation(4000)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 bg-accent-blue hover:bg-blue-700 hover:bg-accent-blue/90 text-white text-xs font-semibold shadow-xs transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{simulationStatus.currentStage === 0 ? 'Start Live Run' : 'Resume Run'}</span>
                  </button>
                )}

                <button
                  onClick={stepSimulation}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-xs font-semibold text-fg transition-all"
                  title="Execute next simulation step"
                >
                  <SkipForward className="w-3.5 h-3.5 text-fg-muted" />
                  <span>Step</span>
                </button>

                <button
                  onClick={resetSimulation}
                  className="p-1.5 rounded-lg bg-surface hover:bg-surface-raised border border-border text-xs text-fg-muted hover:text-fg transition-all"
                  title="Reset simulation to stage 0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3. Discrete Presentation Triggers */}
            <div>
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[11px] font-bold text-fg uppercase tracking-wider flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-fg-muted" />
                  Discrete Presentation Triggers
                </span>
                <button
                  onClick={() => setShowManualTriggers(!showManualTriggers)}
                  className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showManualTriggers ? 'Hide' : 'Show'}
                </button>
              </div>

              {showManualTriggers && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => triggerNewEmergency()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-raised hover:bg-surface border border-border-subtle text-[11px] font-medium text-fg text-left transition-all"
                    title="Simulate incoming emergency CAD call"
                  >
                    <Radio className="w-3 h-3 text-red-500 shrink-0" />
                    <span className="truncate">New Emergency</span>
                  </button>

                  <button
                    onClick={() => simulateEtaUpdate(4, 'Cleared Zirakpur highway flyover - Express corridor established')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-raised hover:bg-surface border border-border-subtle text-[11px] font-medium text-fg text-left transition-all"
                    title="Simulate ambulance telemetry speedup"
                  >
                    <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">Update ETA (4m)</span>
                  </button>

                  <button
                    onClick={() => simulateHospitalAck('Dr. Verma on standby. Cath lab team notified and scrubbed.')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-raised hover:bg-surface border border-border-subtle text-[11px] font-medium text-fg text-left transition-all"
                    title="Simulate hospital emergency department acknowledgement"
                  >
                    <Building2 className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="truncate">Hospital Ack</span>
                  </button>

                  <button
                    onClick={() => simulateAmbulanceArrival()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-raised hover:bg-surface border border-border-subtle text-[11px] font-medium text-fg text-left transition-all"
                    title="Simulate ambulance arrival at ED intake bay"
                  >
                    <Ambulance className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">Ambulance Arrived</span>
                  </button>

                  <button
                    onClick={() => notificationService.createTestNotification()}
                    className="col-span-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/25 text-[11px] font-semibold text-blue-600 dark:text-blue-400 transition-all"
                    title="Create deterministic test notification for INC-8841"
                  >
                    <Radio className="w-3 h-3 text-blue-500" />
                    <span>Create Test Notification (INC-8841)</span>
                  </button>

                  <button
                    onClick={() => simulateHandover('Clinical transfer completed to Dr. Verma in Cath Lab 1')}
                    className="col-span-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 transition-all"
                    title="Simulate patient clinical handover & unit release"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Complete Patient Handover</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
