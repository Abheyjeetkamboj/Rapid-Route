import type {
  EmergencySeverity,
  AmbulanceCapability,
  DispatchRecommendation,
  CandidateEvaluation,
} from '../types';

export type ConfidenceLevel = 'HIGH CONFIDENCE' | 'MEDIUM CONFIDENCE' | 'NEEDS CONFIRMATION';

export type ExtractionFieldSource = 'AI_EXTRACTED' | 'MANUAL_OVERRIDE' | 'DEFAULT';

export interface FieldProvenance<T = unknown> {
  field: string;
  value: T;
  source: ExtractionFieldSource;
  confidenceScore: number; // 0.0 to 1.0
  confidenceLabel: ConfidenceLevel;
  rawSnippet?: string;
}

export interface ExtractedEmergency {
  rawText: string;
  location?: string;
  patientAge?: number;
  patientCount: number;
  symptoms: string[];
  emergencyCategory: string; // Non-diagnostic potential category (e.g. "Cardiac / respiratory")
  severityIndicators: string[];
  suggestedUrgency: EmergencySeverity;
  suggestedCapability: AmbulanceCapability;
  notes?: string;
  missingInformation: string[];
  conflictingInformation: string[];
  provenance: Record<string, FieldProvenance>;
  extractedAt: string;
  isDemoScenario?: boolean;
}

export interface DispatchExplanationContext {
  recommendation: DispatchRecommendation;
  incidentLocation: string;
  incidentCategory: string;
  incidentSeverity: string;
  requiredCapability: string;
  runnerUp?: CandidateEvaluation | null;
}

export interface DispatchExplanation {
  headline: string;
  primaryReasons: string[];
  runnerUpComparison?: string;
  trafficInsight: string;
  medicalCapabilityInsight: string;
  factsGroundingNote: string;
}

export type AiServiceStatus = 'DEMO_MODE' | 'READY' | 'UNAVAILABLE';

