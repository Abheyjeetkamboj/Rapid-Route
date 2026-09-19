import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  MapPin,
  HeartPulse,
  Users,
  Stethoscope,
  Edit3,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import type { ExtractedEmergency, ConfidenceLevel } from '../../ai/aiTypes';
import {
  extractEmergencyInformation,
  getAiServiceStatus,
  DEMO_SCENARIOS,
} from '../../ai/aiService';
import { Button } from '../ui';

interface AiIntakeAssistantProps {
  onAccept: (extracted: ExtractedEmergency) => void;
  onEdit: (extracted: ExtractedEmergency) => void;
  onCancel?: () => void;
}

export const AiIntakeAssistant: React.FC<AiIntakeAssistantProps> = ({
  onAccept,
  onEdit,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<ExtractedEmergency | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const aiStatus = getAiServiceStatus();

  const handleSelectScenario = (text: string) => {
    setInputText(text);
    setErrorMessage(null);
    setExtractedData(null);
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Please enter or paste emergency caller notes to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const result = await extractEmergencyInformation(inputText);
      setExtractedData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI extraction service unavailable.';
      setErrorMessage(msg);
      setExtractedData(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setInputText('');
    setExtractedData(null);
    setErrorMessage(null);
  };

  const renderConfidenceBadge = (confidence?: ConfidenceLevel) => {
    if (!confidence) return null;
    switch (confidence) {
      case 'HIGH CONFIDENCE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-status-available/10 text-status-available border border-status-available/20">
            HIGH CONFIDENCE
          </span>
        );
      case 'MEDIUM CONFIDENCE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
            MEDIUM CONFIDENCE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent-red/10 text-accent-red border border-accent-red/20">
            NEEDS CONFIRMATION
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header with AI Status */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-surface-raised border border-border-subtle">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-blue" />
          <span className="text-xs font-bold text-fg uppercase tracking-wider">
            AI Emergency Intake Assistant
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-surface-overlay border border-border text-fg-muted">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              aiStatus === 'UNAVAILABLE'
                ? 'bg-accent-red'
                : 'bg-accent-blue animate-pulse'
            }`}
          />
          {aiStatus === 'DEMO_MODE'
            ? 'AI ENGINE ● DEMO MODE'
            : aiStatus === 'READY'
            ? 'AI ENGINE ● READY'
            : 'AI ENGINE ● UNAVAILABLE'}
        </span>
      </div>

      {/* 2. Demo Scenarios Quick Pick */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-fg-muted uppercase tracking-wider text-[11px]">
            Quick Test Scenarios (1-Click CAD Input):
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DEMO_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => handleSelectScenario(sc.rawText)}
              className="text-left p-2.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-overlay hover:border-accent-blue/50 transition-all text-xs space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg group-hover:text-accent-blue transition-colors">
                  {sc.label.split(':')[0]}
                </span>
                <span className="text-[9px] font-mono font-semibold text-fg-muted">
                  {sc.badge}
                </span>
              </div>
              <p className="text-[11px] text-fg-muted line-clamp-2 leading-tight">
                {sc.rawText}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Unstructured Caller Report Text Area */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-accent-blue" />
            Free-Text 112 Emergency Call Report / Caller Notes
          </label>
          {inputText && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-fg-muted hover:text-fg flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste or type caller report... (e.g. 'A 55 year old male at Chitkara University is having severe chest pain and difficulty breathing. One patient. Conscious but uncomfortable.')"
          className="w-full px-3.5 py-2.5 rounded-lg bg-surface-overlay border border-border text-xs text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue leading-relaxed resize-none font-sans"
        />
      </div>

      {/* Error Message & Fallback */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-[11px] text-fg-muted">
              Dispatcher can continue by entering details manually below.
            </p>
          </div>
        </div>
      )}

      {/* Analyze CTA */}
      {!extractedData && (
        <Button
          variant="primary"
          size="md"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !inputText.trim()}
          icon={<Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />}
          className="w-full text-xs font-bold uppercase tracking-wider py-2.5 shadow-sm"
        >
          {isAnalyzing ? 'Analyzing Caller Information...' : 'Analyze Call with AI Assistant'}
        </Button>
      )}

      {/* 4. Extracted Structured Information Review Card */}
      {extractedData && (
        <div className="p-4 rounded-xl border border-accent-blue/40 bg-surface-raised space-y-4 shadow-sm animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-status-available" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-fg">
                  AI-Extracted Information (Review Required)
                </h4>
                <p className="text-[10px] text-fg-muted">
                  Non-diagnostic triage indicators. Dispatcher must verify before dispatch analysis.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-status-available font-bold bg-status-available/10 px-2 py-0.5 rounded border border-status-available/20">
              Extraction Complete
            </span>
          </div>

          {/* Missing / Conflicting Information Warning Banners */}
          {extractedData.missingInformation.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 space-y-1">
              <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Missing or Incomplete Information:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-fg-muted">
                {extractedData.missingInformation.map((m, idx) => (
                  <li key={idx} className="text-fg">{m}</li>
                ))}
              </ul>
            </div>
          )}

          {extractedData.conflictingInformation.length > 0 && (
            <div className="p-3 rounded-lg bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red space-y-1">
              <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Conflicting Statements Detected:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {extractedData.conflictingInformation.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Structured Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Location */}
            <div className="p-2.5 rounded-lg bg-surface border border-border-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-accent-red" />
                  Patient Location
                </span>
                {renderConfidenceBadge(extractedData.provenance.location?.confidenceLabel)}
              </div>
              <p className={`font-bold text-xs ${extractedData.location ? 'text-fg' : 'text-accent-red italic'}`}>
                {extractedData.location || 'Location missing (Required)'}
              </p>
            </div>

            {/* Patient Demographics */}
            <div className="p-2.5 rounded-lg bg-surface border border-border-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint flex items-center gap-1">
                  <Users className="w-3 h-3 text-accent-blue" />
                  Patient Details
                </span>
                {renderConfidenceBadge(extractedData.provenance.patientCount?.confidenceLabel)}
              </div>
              <p className="font-bold text-xs text-fg">
                {extractedData.patientCount} {extractedData.patientCount === 1 ? 'Patient' : 'Patients'}
                {extractedData.patientAge ? ` • ~${extractedData.patientAge} years old` : ''}
              </p>
            </div>

            {/* Potential Emergency Category */}
            <div className="p-2.5 rounded-lg bg-surface border border-border-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint flex items-center gap-1">
                  <HeartPulse className="w-3 h-3 text-status-enroute" />
                  Potential Emergency Category
                </span>
                {renderConfidenceBadge(extractedData.provenance.emergencyCategory?.confidenceLabel)}
              </div>
              <p className="font-bold text-xs text-fg">
                {extractedData.emergencyCategory}
              </p>
            </div>

            {/* Suggested Capability & Urgency */}
            <div className="p-2.5 rounded-lg bg-surface border border-border-subtle space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint flex items-center gap-1">
                  <Stethoscope className="w-3 h-3 text-accent-blue" />
                  Suggested Capability
                </span>
                {renderConfidenceBadge(extractedData.provenance.suggestedCapability?.confidenceLabel)}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-accent-blue">
                  {extractedData.suggestedCapability}
                </span>
                <span className="text-fg-faint">•</span>
                <span className="text-[11px] font-bold text-status-available">
                  {extractedData.suggestedUrgency} Urgency
                </span>
              </div>
            </div>
          </div>

          {/* Reported Symptoms */}
          <div className="p-2.5 rounded-lg bg-surface border border-border-subtle space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint block">
              Extracted Symptoms & Clinical Indicators:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {extractedData.symptoms.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-surface-overlay text-fg font-medium text-[11px] border border-border-subtle"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Human Review CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <Button
              variant="primary"
              size="md"
              onClick={() => onAccept(extractedData)}
              disabled={!extractedData.location}
              icon={<CheckCircle2 className="w-4 h-4" />}
              className="w-full sm:flex-1 text-xs font-bold uppercase tracking-wider shadow-sm"
            >
              Accept Extracted Details & Run Engine
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => onEdit(extractedData)}
              icon={<Edit3 className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              Edit Details
            </Button>

            <button
              type="button"
              onClick={() => setExtractedData(null)}
              className="px-3 py-2 text-xs font-semibold text-fg-muted hover:text-fg transition-colors"
            >
              Re-Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
