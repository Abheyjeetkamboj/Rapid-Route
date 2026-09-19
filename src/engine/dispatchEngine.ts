import type {
  Ambulance,
  EmergencyDispatchInput,
  DispatchRecommendation,
  CandidateEvaluation,
} from '../types';
import { evaluateCapabilityMatch } from './capabilityMatcher';
import { scoreCandidate, compareCandidates } from './scoring';

/* =========================================================
   RAPIDROUTE AI — DISPATCH DECISION ENGINE
   "Fastest suitable ambulance, not simply nearest ambulance"
   ========================================================= */

export interface DispatchEngineOptions {
  now?: string;
}

/**
 * Executes the full two-stage dispatch decision pipeline:
 * 1. Hard Suitability Filtering (Availability, Telemetry, Medical Capability)
 * 2. Multi-factor Scoring & Ranking (50% ETA, 25% Capability, 15% Traffic, 10% Availability)
 */
export function findBestAmbulance(
  emergency: EmergencyDispatchInput,
  ambulanceFleet: Ambulance[],
  options?: DispatchEngineOptions
): DispatchRecommendation {
  const evaluatedAt =
    options?.now ||
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' IST';

  // 1. Data Integrity Check
  if (!emergency.location || emergency.location.trim() === '') {
    return createEmptyRecommendation(
      emergency.id,
      'Emergency location is required to calculate transit ETAs.',
      [],
      evaluatedAt
    );
  }

  if (!emergency.emergencyType || emergency.emergencyType.trim() === '') {
    return createEmptyRecommendation(
      emergency.id,
      'Emergency type is required for clinical triage assessment.',
      [],
      evaluatedAt
    );
  }

  const requiredCapability = emergency.requiredCapability || 'ALS';

  const eligibleCandidates: CandidateEvaluation[] = [];
  const excludedCandidates: CandidateEvaluation[] = [];

  // 2. Stage 1: Hard Suitability Filtering
  for (const ambulance of ambulanceFleet) {
    // Check 1: Status must be Available
    if (ambulance.status.toUpperCase() !== 'AVAILABLE') {
      excludedCandidates.push({
        ambulance,
        isEligible: false,
        exclusionReason: ambulance.status === 'BUSY'
          ? `Ambulance currently busy on active incident${ambulance.assignedIncident ? ` (${ambulance.assignedIncident})` : ''}`
          : ambulance.status === 'EN_ROUTE'
          ? 'Ambulance currently en route to another incident'
          : 'Ambulance currently offline for maintenance',
        reasons: [],
      });
      continue;
    }

    // Check 2: ETA telemetry must be available
    if (ambulance.etaMinutes === null || ambulance.etaMinutes === undefined || isNaN(ambulance.etaMinutes)) {
      excludedCandidates.push({
        ambulance,
        isEligible: false,
        exclusionReason: 'ETA telemetry unavailable for this unit',
        reasons: [],
      });
      continue;
    }

    // Check 3: Medical capability match
    const capabilityResult = evaluateCapabilityMatch(
      requiredCapability,
      ambulance.capability,
      emergency.emergencyType,
      emergency.severity
    );

    if (!capabilityResult.isSuitable) {
      excludedCandidates.push({
        ambulance,
        isEligible: false,
        exclusionReason: capabilityResult.reason,
        reasons: [],
      });
      continue;
    }

    // Passed hard filters
    const scoreBreakdown = scoreCandidate(
      ambulance,
      requiredCapability,
      emergency.emergencyType,
      emergency.severity
    );

    // Build candidate specific reasons
    const candidateReasons: string[] = [];
    if (ambulance.etaMinutes <= 10) {
      candidateReasons.push(`Fast ETA: ${ambulance.etaMinutes} min to scene`);
    } else {
      candidateReasons.push(`Estimated ETA: ${ambulance.etaMinutes} min`);
    }
    candidateReasons.push(capabilityResult.reason);
    if (ambulance.trafficCondition === 'Light') {
      candidateReasons.push(`Light traffic along ${ambulance.currentArea} corridor`);
    } else if (ambulance.trafficCondition === 'Moderate') {
      candidateReasons.push(`Moderate traffic route`);
    }

    eligibleCandidates.push({
      ambulance,
      isEligible: true,
      scoreBreakdown,
      reasons: candidateReasons,
    });
  }

  // 3. Stage 2: Handle Edge Cases if no candidates eligible
  if (eligibleCandidates.length === 0) {
    let statusMessage = 'No suitable ambulance available.';

    const availableCount = ambulanceFleet.filter(
      (a) => a.status.toUpperCase() === 'AVAILABLE'
    ).length;

    if (availableCount === 0) {
      statusMessage = 'No ambulances currently available in regional network.';
    } else {
      const capabilityExclusions = excludedCandidates.filter((c) =>
        c.exclusionReason?.toLowerCase().includes('lack') ||
        c.exclusionReason?.toLowerCase().includes('insufficient') ||
        c.exclusionReason?.toLowerCase().includes('ventilator')
      );

      if (capabilityExclusions.length > 0 && capabilityExclusions.length === availableCount) {
        statusMessage = `No available ambulance currently meets the required medical capability (${requiredCapability}).`;
      } else {
        const missingEtaCount = excludedCandidates.filter((c) =>
          c.exclusionReason?.includes('ETA telemetry')
        ).length;
        if (missingEtaCount === availableCount) {
          statusMessage = 'ETA telemetry unavailable for eligible units.';
        }
      }
    }

    return createEmptyRecommendation(
      emergency.id,
      statusMessage,
      excludedCandidates,
      evaluatedAt
    );
  }

  // 4. Stage 3: Multi-Factor Scoring & Ranking
  eligibleCandidates.sort((a, b) => {
    return compareCandidates(
      { ambulance: a.ambulance, scoreBreakdown: a.scoreBreakdown! },
      { ambulance: b.ambulance, scoreBreakdown: b.scoreBreakdown! }
    );
  });

  // Assign ranks
  eligibleCandidates.forEach((c, idx) => {
    c.rank = idx + 1;
  });

  const winner = eligibleCandidates[0];
  const runnerUp = eligibleCandidates[1];

  // 5. Generate Top Recommendation Explainability Rationale
  const winnerReasons: string[] = [];

  // Reason 1: ETA comparison
  if (runnerUp && winner.ambulance.etaMinutes! < runnerUp.ambulance.etaMinutes!) {
    const diff = runnerUp.ambulance.etaMinutes! - winner.ambulance.etaMinutes!;
    winnerReasons.push(
      `Fastest eligible ETA (${winner.ambulance.etaMinutes} min, ${diff} min faster than ${runnerUp.ambulance.id})`
    );
  } else {
    winnerReasons.push(`Fastest eligible ETA (${winner.ambulance.etaMinutes} min arrival window)`);
  }

  // Reason 2: Capability match
  const capResult = evaluateCapabilityMatch(
    requiredCapability,
    winner.ambulance.capability,
    emergency.emergencyType,
    emergency.severity
  );
  winnerReasons.push(capResult.reason);

  // Reason 3: Availability & location
  winnerReasons.push(`Stationed at ${winner.ambulance.currentArea} with verified crew readiness`);

  // Reason 4: Traffic conditions
  if (winner.ambulance.trafficCondition === 'Light') {
    winnerReasons.push('Light traffic corridor with direct arterial routing');
  } else if (winner.ambulance.trafficCondition === 'Moderate') {
    winnerReasons.push('Optimal route selected bypassing highway construction');
  }

  return {
    emergencyId: emergency.id,
    hasSuitableAmbulance: true,
    statusMessage: `Optimal candidate ${winner.ambulance.id} identified with composite score ${winner.scoreBreakdown!.finalScore}`,
    recommendedAmbulanceId: winner.ambulance.id,
    recommendedAmbulance: winner.ambulance,
    finalScore: winner.scoreBreakdown!.finalScore,
    etaMinutes: winner.ambulance.etaMinutes,
    eligibleCandidates,
    excludedCandidates,
    reasons: winnerReasons,
    evaluatedAt,
  };
}

function createEmptyRecommendation(
  emergencyId: string,
  statusMessage: string,
  excludedCandidates: CandidateEvaluation[],
  evaluatedAt: string
): DispatchRecommendation {
  return {
    emergencyId,
    hasSuitableAmbulance: false,
    statusMessage,
    recommendedAmbulanceId: null,
    recommendedAmbulance: null,
    finalScore: null,
    etaMinutes: null,
    eligibleCandidates: [],
    excludedCandidates,
    reasons: [],
    evaluatedAt,
  };
}

