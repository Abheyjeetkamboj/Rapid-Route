import type { Ambulance, AmbulanceCapability } from './index';

/* =========================================================
   DISPATCH DECISION ENGINE — TYPE DEFINITIONS
   ========================================================= */

export interface DispatchScoreBreakdown {
  etaScore: number;
  capabilityScore: number;
  trafficScore: number;
  availabilityScore: number;
  weightedEta: number;
  weightedCapability: number;
  weightedTraffic: number;
  weightedAvailability: number;
  finalScore: number;
}

export interface CandidateEvaluation {
  ambulance: Ambulance;
  isEligible: boolean;
  exclusionReason?: string;
  scoreBreakdown?: DispatchScoreBreakdown;
  rank?: number;
  reasons: string[];
}

export interface DispatchRecommendation {
  emergencyId: string;
  hasSuitableAmbulance: boolean;
  statusMessage: string;
  recommendedAmbulanceId: string | null;
  recommendedAmbulance: Ambulance | null;
  finalScore: number | null;
  etaMinutes: number | null;
  eligibleCandidates: CandidateEvaluation[];
  excludedCandidates: CandidateEvaluation[];
  reasons: string[];
  evaluatedAt: string;
}

export interface DispatchSelectionRecord {
  emergencyId: string;
  recommendedAmbulanceId: string;
  selectedAmbulanceId: string;
  isOverride: boolean;
  overrideReason?: string;
  timestamp: string;
  authorizedBy: string;
}

export interface EmergencyDispatchInput {
  id: string;
  location: string;
  emergencyType: string;
  severity: 'Critical' | 'Urgent' | 'Routine' | string;
  patientCount: number;
  requiredCapability: AmbulanceCapability | string;
  notes?: string;
}
