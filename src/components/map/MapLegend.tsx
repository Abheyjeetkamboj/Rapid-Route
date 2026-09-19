import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';

export const MapLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-surface/90 backdrop-blur-md border border-border rounded-xl shadow-card text-xs overflow-hidden transition-all max-w-[280px]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-overlay/50 border-b border-border-subtle font-bold text-[10px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-accent-blue" />
          Tactical Map Legend
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 space-y-2.5 font-medium text-[11px]">
          {/* Markers */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">
              Entities
            </div>
            <div className="flex items-center gap-2 text-fg">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-red ring-2 ring-accent-red/30 flex-shrink-0" />
              <span>Active Emergency (Critical / Urgent)</span>
            </div>
            <div className="flex items-center gap-2 text-fg">
              <span className="w-2.5 h-2.5 rounded-sm bg-status-available flex-shrink-0" />
              <span>Available Ambulance (Ready)</span>
            </div>
            <div className="flex items-center gap-2 text-fg">
              <span className="w-2.5 h-2.5 rounded-sm bg-accent-blue flex-shrink-0" />
              <span>Ambulance En Route / Busy</span>
            </div>
            <div className="flex items-center gap-2 text-fg">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-700 flex-shrink-0 text-[8px] text-white flex items-center justify-center font-bold">
                H
              </span>
              <span>Receiving Hospital Hub</span>
            </div>
          </div>

          <div className="border-t border-border-subtle pt-2 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">
              Route Telemetry
            </div>
            <div className="flex items-center gap-2 text-fg">
              <span className="w-4 h-1 rounded-full bg-status-available flex-shrink-0" />
              <span>
                <strong>Recommended Route</strong> (Fastest ETA)
              </span>
            </div>
            <div className="flex items-center gap-2 text-fg">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-amber-500 flex-shrink-0" />
              <span>Alternative Candidate (Congested / Slower)</span>
            </div>
            <div className="flex items-center gap-2 text-fg">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-blue-500 flex-shrink-0" />
              <span>Hospital Transfer Path</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

