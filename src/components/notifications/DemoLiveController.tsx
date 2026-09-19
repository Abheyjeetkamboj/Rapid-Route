import { useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { useDispatchContext } from '../../context/DispatchContext';

export function DemoLiveController() {
  const {
    simulationStatus,
    startSimulation,
    pauseSimulation,
    stepSimulation,
    resetSimulation,
    realtimeStatus,
  } = useDispatchContext();

  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  return (
    <div className="fixed bottom-4 right-6 z-40 flex flex-col items-end">
      <div className="rounded-xl bg-surface/95 backdrop-blur-md border border-border shadow-elevated overflow-hidden transition-all duration-200">
        {/* Top Control Bar */}
        <div className="px-3.5 py-2 bg-surface-raised border-b border-border-subtle flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                simulationStatus.isRunning ? 'bg-status-available animate-ping-subtle' : 'bg-accent-blue'
              }`}
            />
            <Activity className="w-3.5 h-3.5 text-accent-blue" />
            <span className="font-bold text-fg tracking-tight">DEMO LIVE SIMULATION</span>
            <span className="px-1.5 py-0.2 rounded bg-surface border border-border text-[10px] font-mono text-fg-muted font-semibold">
              {realtimeStatus === 'LIVE' ? 'LIVE SUPABASE' : 'DEMO BUS'}
            </span>
          </div>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-fg-muted hover:text-fg hover:bg-surface transition-colors"
            title={isMinimized ? 'Expand simulation panel' : 'Minimize simulation panel'}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Body */}
        {!isMinimized && (
          <div className="p-3.5 space-y-3 min-w-[320px] max-w-sm">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-fg font-mono">
                  Stage {simulationStatus.currentStage} of {simulationStatus.totalStages}: {simulationStatus.stageName}
                </span>
                <span className="text-[11px] font-mono text-fg-faint">
                  {Math.round((simulationStatus.currentStage / simulationStatus.totalStages) * 100)}%
                </span>
              </div>
              <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                {simulationStatus.stageDescription}
              </p>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-surface-raised rounded-full mt-2 overflow-hidden border border-border-subtle">
                <div
                  style={{ width: `${(simulationStatus.currentStage / simulationStatus.totalStages) * 100}%` }}
                  className="h-full bg-accent-blue rounded-full transition-all duration-300"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
              {simulationStatus.isRunning ? (
                <button
                  onClick={pauseSimulation}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs font-semibold text-fg transition-all"
                >
                  <Pause className="w-3.5 h-3.5 text-accent-amber" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  onClick={() => startSimulation(4000)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue hover:bg-accent-blue/90 text-white text-xs font-semibold shadow-xs transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{simulationStatus.currentStage === 0 ? 'Start Scenario' : 'Resume'}</span>
                </button>
              )}

              <button
                onClick={stepSimulation}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs font-semibold text-fg transition-all"
                title="Execute single next simulation step"
              >
                <SkipForward className="w-3.5 h-3.5 text-fg-muted" />
                <span>Step</span>
              </button>

              <button
                onClick={resetSimulation}
                className="p-1.5 rounded-lg bg-surface-raised hover:bg-surface border border-border-subtle text-xs text-fg-muted hover:text-fg transition-all"
                title="Reset simulation to initial state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

