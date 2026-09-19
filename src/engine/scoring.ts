import type { Ambulance, TrafficCondition, DispatchScoreBreakdown } from '../types';
import { evaluateCapabilityMatch } from './capabilityMatcher';

/* =========================================================
   DISPATCH SCORING ENGINE
   Transparent, weighted multi-factor decision model
   ========================================================= */

export const SCORING_WEIGHTS = {
  ETA: 0.50,          // 50% Dominant factor
  CAPABILITY: 0.25,   // 25% Medical alignment
  TRAFFIC: 0.15,      // 15% Real-world route congestion
  AVAILABILITY: 0.10, // 10% Operational readiness
} as const;

/**
 * Normalizes an arrival ETA (in minutes) to a 0 - 100 score.
 * Lower ETA = higher score.
 *
 * Benchmark mapping:
 * <= 3 min  -> 100 (Optimal immediate arrival)
 * 5 min     -> ~95 (Excellent)
 * 8 min     -> ~86 (Very good)
 * 10 min    -> ~80 (Good / standard benchmark)
 * 15 min    -> ~60 (Moderate)
 * 20 min    -> ~35 (Delayed)
 * > 20 min  -> down to 10 (Low)
 */
export function calculateEtaScore(etaMinutes: number): number {
  if (etaMinutes <= 0) return 100;
  if (etaMinutes <= 3) return 100;
  if (etaMinutes <= 5) return Math.round(100 - (etaMinutes - 3) * 2.5);
  if (etaMinutes <= 10) return Math.round(95 - (etaMinutes - 5) * 3);
  if (etaMinutes <= 15) return Math.round(80 - (etaMinutes - 10) * 4);
  if (etaMinutes <= 20) return Math.round(60 - (etaMinutes - 15) * 5);
  return Math.max(10, Math.round(35 - (etaMinutes - 20) * 2));
}

/**
 * Evaluates traffic congestion along the vehicle's transit corridor.
 * Light = 100
 * Moderate = 70
 * Heavy = 40
 */
export function calculateTrafficScore(traffic: TrafficCondition | string | null): number {
  if (!traffic) return 70; // Default baseline if telemetry missing
  const clean = traffic.trim().toLowerCase();
  if (clean === 'light') return 100;
  if (clean === 'moderate') return 70;
  if (clean === 'heavy') return 40;
  return 70;
}

/**
 * Calculates operational availability score.
 * Only Available units achieve a 100 score.
 */
export function calculateAvailabilityScore(status: string): number {
  return status.toUpperCase() === 'AVAILABLE' ? 100 : 0;
}

/**
 * Computes complete transparent score breakdown for an ambulance candidate.
 */
export function scoreCandidate(
  ambulance: Ambulance,
  requiredCapability: string,
  emergencyType: string = '',
  severity: string = ''
): DispatchScoreBreakdown {
  const etaMinutes = ambulance.etaMinutes ?? 99;
  const etaScore = calculateEtaScore(etaMinutes);

  const capabilityResult = evaluateCapabilityMatch(
    requiredCapability,
    ambulance.capability,
    emergencyType,
    severity
  );
  const capabilityScore = capabilityResult.score;

  const trafficScore = calculateTrafficScore(ambulance.trafficCondition);
  const availabilityScore = calculateAvailabilityScore(ambulance.status);

  const weightedEta = etaScore * SCORING_WEIGHTS.ETA;
  const weightedCapability = capabilityScore * SCORING_WEIGHTS.CAPABILITY;
  const weightedTraffic = trafficScore * SCORING_WEIGHTS.TRAFFIC;
  const weightedAvailability = availabilityScore * SCORING_WEIGHTS.AVAILABILITY;

  const finalScore = Math.round((weightedEta + weightedCapability + weightedTraffic + weightedAvailability) * 10) / 10;

  return {
    etaScore,
    capabilityScore,
    trafficScore,
    availabilityScore,
    weightedEta: Math.round(weightedEta * 10) / 10,
    weightedCapability: Math.round(weightedCapability * 10) / 10,
    weightedTraffic: Math.round(weightedTraffic * 10) / 10,
    weightedAvailability: Math.round(weightedAvailability * 10) / 10,
    finalScore,
  };
}

/**
 * Deterministic candidate comparator for ranking.
 * Rank criteria:
 * 1. Final score descending (higher is better)
 * 2. Tie-breaker 1: Lower ETA
 * 3. Tie-breaker 2: Higher capability score
 * 4. Tie-breaker 3: Higher traffic score
 * 5. Tie-breaker 4: Alphabetical vehicle ID
 */
export function compareCandidates(
  a: { ambulance: Ambulance; scoreBreakdown: DispatchScoreBreakdown },
  b: { ambulance: Ambulance; scoreBreakdown: DispatchScoreBreakdown }
): number {
  const scoreDiff = b.scoreBreakdown.finalScore - a.scoreBreakdown.finalScore;
  if (Math.abs(scoreDiff) >= 0.05) {
    return scoreDiff;
  }

  // Tie-breaker 1: Lower ETA
  const etaA = a.ambulance.etaMinutes ?? 999;
  const etaB = b.ambulance.etaMinutes ?? 999;
  if (etaA !== etaB) {
    return etaA - etaB;
  }

  // Tie-breaker 2: Higher capability score
  const capDiff = b.scoreBreakdown.capabilityScore - a.scoreBreakdown.capabilityScore;
  if (capDiff !== 0) {
    return capDiff;
  }

  // Tie-breaker 3: Higher traffic score (lighter traffic)
  const trafficDiff = b.scoreBreakdown.trafficScore - a.scoreBreakdown.trafficScore;
  if (trafficDiff !== 0) {
    return trafficDiff;
  }

  // Tie-breaker 4: Deterministic ID
  return a.ambulance.id.localeCompare(b.ambulance.id);
}

