import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Activity, CheckCircle2 } from 'lucide-react';
import type { RouteGeometry, LatLngTuple } from '../../map/mapTypes';
import { interpolateRoutePosition } from '../../map/routingService';

interface DemoTelemetryControllerProps {
  route: RouteGeometry | null;
  onPositionUpdate: (pos: LatLngTuple | null, progress: number) => void;
  onComplete?: () => void;
  ambulanceId: string;
}

export const DemoTelemetryController: React.FC<DemoTelemetryControllerProps> = ({
  route,
  onPositionUpdate,
  onComplete,
  ambulanceId,
}) => {
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [progress, setProgress] = React.useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = React.useState<number>(1);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Total simulated real-world transit duration (30 seconds baseline for demo at 1x)
  const BASE_DURATION_MS = 24000;

  // Reset when route or ambulance changes
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    onPositionUpdate(null, 0);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, [route?.id, ambulanceId]);

  useEffect(() => {
    if (!isPlaying || !route) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Increment progress based on speed
      const duration = BASE_DURATION_MS / speedMultiplier;
      const progressInc = delta / duration;

      setProgress((prev) => {
        const next = Math.min(1.0, prev + progressInc);
        const currentCoord = interpolateRoutePosition(route.coordinates, next);
        onPositionUpdate(currentCoord, next);

        if (next >= 1.0) {
          setIsPlaying(false);
          onComplete?.();
          return 1.0;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, route, speedMultiplier]);

  const handleTogglePlay = () => {
    if (progress >= 1.0) {
      // Re-start from 0 if completed
      setProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
    if (route) {
      onPositionUpdate(null, 0);
    }
  };

  if (!route) return null;

  const remainingKm = Math.max(0, Math.round((route.distanceKm * (1 - progress)) * 10) / 10);
  const remainingEtaMinutes = Math.max(0, Math.ceil(route.etaMinutes * (1 - progress)));
  const isArrived = progress >= 1.0;

  return (
    <div className="p-4 rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-card space-y-3">
      {/* Header with Demo Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-status-enroute animate-pulse" />
          <span className="text-xs font-mono font-bold text-fg uppercase tracking-wider">
            {ambulanceId} En-Route Transit
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-accent-blue-subtle text-accent-blue border border-accent-blue/30">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-ping-subtle" />
          DEMO TELEMETRY
        </span>
      </div>

      {/* Progress Bar & Telemetry Readout */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-fg-muted">
            {isArrived ? (
              <span className="text-status-available font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ARRIVED ON SCENE
              </span>
            ) : (
              `${remainingKm} km remaining`
            )}
          </span>
          <span className="font-bold text-fg">
            {isArrived ? '00:00 ETA' : `${remainingEtaMinutes} min ETA`} ({Math.round(progress * 100)}%)
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-surface-overlay overflow-hidden border border-border-subtle">
          <div
            className="h-full bg-gradient-to-r from-accent-blue to-status-available transition-all duration-100 ease-linear rounded-full"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs transition-colors ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-accent-blue hover:bg-blue-600 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> {progress > 0 && progress < 1 ? 'Resume' : 'Start Simulation'}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={progress === 0}
            className="p-1.5 rounded-lg border border-border bg-surface-overlay/60 hover:bg-surface-overlay text-fg-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Multiplier */}
        <div className="inline-flex items-center gap-1 bg-surface-overlay p-0.5 rounded-lg border border-border-subtle text-[11px] font-mono font-bold">
          <span className="px-1.5 text-fg-faint flex items-center">
            <FastForward className="w-3 h-3 mr-0.5" /> Speed:
          </span>
          {([1, 2, 5] as const).map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => setSpeedMultiplier(spd)}
              className={`px-2 py-0.5 rounded transition-all ${
                speedMultiplier === spd
                  ? 'bg-surface text-fg shadow-xs border border-border-subtle'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
