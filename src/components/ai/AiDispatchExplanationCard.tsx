import React from 'react';
import { Sparkles, CheckCircle2, TrendingDown, Info } from 'lucide-react';
import type { DispatchExplanation } from '../../ai/aiTypes';

interface AiDispatchExplanationCardProps {
  explanation: DispatchExplanation;
  winnerId: string;
}

export const AiDispatchExplanationCard: React.FC<AiDispatchExplanationCardProps> = ({
  explanation,
  winnerId,
}) => {
  return (
    <div className="p-4 rounded-xl border border-accent-blue/30 bg-surface-raised space-y-3.5 text-xs shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-blue" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-fg">
            AI-Assisted Dispatch Rationale ({winnerId})
          </h4>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-blue-subtle text-accent-blue border border-accent-blue/20 font-bold">
          Decision Support
        </span>
      </div>

      {/* Primary Justifications */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint block">
          Why this unit is ranked #1:
        </span>
        <div className="space-y-1.5">
          {explanation.primaryReasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2 text-fg leading-relaxed">
              <CheckCircle2 className="w-3.5 h-3.5 text-status-available flex-shrink-0 mt-0.5" />
              <span className="text-[11px]">{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Runner-Up / Proximity Trade-Off Explanation */}
      {explanation.runnerUpComparison && (
        <div className="p-2.5 rounded-lg bg-surface-overlay/80 border border-border-subtle space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-status-enroute flex items-center gap-1.5">
            <TrendingDown className="w-3 h-3 text-status-enroute" />
            Comparison with Alternative Units:
          </span>
          <p className="text-[11px] text-fg-muted leading-relaxed">
            {explanation.runnerUpComparison}
          </p>
        </div>
      )}

      {/* Facts Grounding Footnote */}
      <div className="pt-2 border-t border-border-subtle flex items-start gap-1.5 text-[10px] text-fg-faint leading-tight">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-fg-faint" />
        <span>{explanation.factsGroundingNote}</span>
      </div>
    </div>
  );
};
