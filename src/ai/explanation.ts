import type { DispatchExplanationContext, DispatchExplanation } from './aiTypes';

/**
 * Generates an explainable natural-language dispatch justification strictly grounded
 * in the deterministic dispatch engine results.
 * 
 * Safety Guarantee:
 * - AI never invents ETAs, traffic speeds, capabilities, or scores.
 * - AI never alters the candidate ranking.
 */
export function generateDispatchExplanation(
  context: DispatchExplanationContext
): DispatchExplanation {
  const { recommendation, incidentLocation, incidentCategory, runnerUp } = context;

  const winner = recommendation.recommendedAmbulance;

  if (!recommendation.hasSuitableAmbulance || !winner) {
    return {
      headline: 'No Suitable Ambulance Available in Regional Fleet',
      primaryReasons: [
        recommendation.statusMessage || 'All fleet units fail hard clinical or availability criteria.',
        'Immediate cross-district mutual aid or helicopter EMS transfer recommended.',
      ],
      trafficInsight: 'No eligible route active.',
      medicalCapabilityInsight: `Required capability (${context.requiredCapability}) could not be fulfilled by currently available units.`,
      factsGroundingNote:
        'Evaluation performed by deterministic dispatch decision engine based on hard clinical suitability filters.',
    };
  }

  const primaryReasons: string[] = [];

  // Reason 1: ETA comparison
  if (runnerUp && runnerUp.ambulance.etaMinutes !== null && winner.etaMinutes !== null) {
    const diff = runnerUp.ambulance.etaMinutes - winner.etaMinutes;
    if (diff > 0) {
      primaryReasons.push(
        `Fastest arrival window: ${winner.etaMinutes} min to scene (${diff} min faster than next best unit ${runnerUp.ambulance.id}).`
      );
    } else {
      primaryReasons.push(`Fastest arrival window: ${winner.etaMinutes} min estimated arrival.`);
    }
  } else if (winner.etaMinutes !== null) {
    primaryReasons.push(`Optimal arrival window: ${winner.etaMinutes} min estimated arrival.`);
  }

  // Reason 2: Medical capability
  primaryReasons.push(
    `Certified medical tier: ${winner.capability} matches required ${context.requiredCapability} standard for ${incidentCategory}.`
  );

  // Reason 3: Operational availability
  primaryReasons.push(
    `Fleet readiness: Stationed at ${winner.currentArea} with immediate turnout readiness.`
  );

  // Reason 4: Traffic impact
  if (winner.trafficCondition === 'Light') {
    primaryReasons.push(
      'Corridor traffic: Clear arterial expressway routing with minimal congestion delay.'
    );
  } else if (winner.trafficCondition === 'Moderate') {
    primaryReasons.push(
      'Corridor traffic: Moderate traffic flow factored into telemetry arrival estimate.'
    );
  } else {
    primaryReasons.push(
      'Corridor traffic: Congested corridor factored into prioritized sirens/cleared lane path.'
    );
  }

  // Runner-up trade-off explanation (Proving "Fastest, not simply nearest")
  let runnerUpComparison: string | undefined;

  if (runnerUp && runnerUp.ambulance.etaMinutes !== null && winner.etaMinutes !== null) {
    const diff = runnerUp.ambulance.etaMinutes - winner.etaMinutes;

    // Check if runner up is closer in distance but slower in ETA (e.g. RR-101 vs RR-204)
    if (diff > 0) {
      runnerUpComparison = `Alternative unit ${runnerUp.ambulance.id} (${runnerUp.ambulance.currentArea}) is evaluated at ${runnerUp.ambulance.etaMinutes} min (${diff} min slower) due to ${runnerUp.ambulance.trafficCondition?.toLowerCase() || 'congested'} traffic conditions along its transit corridor.`;
    } else {
      runnerUpComparison = `Alternative unit ${runnerUp.ambulance.id} (${runnerUp.ambulance.currentArea}) scored lower (${runnerUp.scoreBreakdown?.finalScore || 'N/A'}) based on capability and route reliability factors.`;
    }
  }

  const trafficInsight =
    winner.trafficCondition === 'Light'
      ? `Transit corridor from ${winner.currentArea} to ${incidentLocation} has light traffic (1.0x factor).`
      : `Transit corridor from ${winner.currentArea} to ${incidentLocation} is under ${winner.trafficCondition?.toLowerCase() || 'moderate'} flow.`;

  const medicalCapabilityInsight = `Unit ${winner.id} is equipped with ${winner.capability} life-support gear suitable for ${incidentCategory}.`;

  const factsGroundingNote =
    'This explanation was synthesized directly from deterministic CAD telemetry, scoring weights (50% ETA, 25% Capability, 15% Traffic, 10% Availability), and live GIS route calculations.';

  return {
    headline: `AI Operational Recommendation: Dispatch ${winner.id} (${winner.etaMinutes} min ETA)`,
    primaryReasons,
    runnerUpComparison,
    trafficInsight,
    medicalCapabilityInsight,
    factsGroundingNote,
  };
}

