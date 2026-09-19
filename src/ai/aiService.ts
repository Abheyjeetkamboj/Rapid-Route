import type {
  ExtractedEmergency,
  DispatchExplanationContext,
  DispatchExplanation,
  AiServiceStatus,
} from './aiTypes';
import { extractEmergencyDetails, DEMO_SCENARIOS } from './extraction';
import { generateDispatchExplanation } from './explanation';

let currentServiceStatus: AiServiceStatus = 'DEMO_MODE';

/**
 * Returns current status of the AI service ('DEMO_MODE' | 'READY' | 'UNAVAILABLE')
 */
export function getAiServiceStatus(): AiServiceStatus {
  return currentServiceStatus;
}

/**
 * Explicitly sets service status (useful for testing fallback when AI is unavailable)
 */
export function setAiServiceStatus(status: AiServiceStatus): void {
  currentServiceStatus = status;
}

/**
 * Job A: Extracts structured emergency parameters from unstructured 112 caller text.
 * 
 * Safe non-blocking contract:
 * - Operates locally and deterministically in DEMO_MODE.
 * - If service is marked UNAVAILABLE, throws a controlled error allowing graceful fallback.
 */
export async function extractEmergencyInformation(
  text: string
): Promise<ExtractedEmergency> {
  if (currentServiceStatus === 'UNAVAILABLE') {
    throw new Error('AI assistance unavailable. Dispatcher can enter emergency details manually.');
  }

  // Simulate slight realistic processing latency (~200ms) for professional tactical feel
  await new Promise((resolve) => setTimeout(resolve, 180));

  try {
    return extractEmergencyDetails(text);
  } catch {
    throw new Error('AI assistance unavailable. Dispatcher can enter emergency details manually.');
  }
}

/**
 * Job B: Explains why the deterministic dispatch engine selected a particular ambulance.
 * 
 * Safe non-blocking contract:
 * - Grounded 100% in actual dispatch engine scores, ETAs, and traffic conditions.
 * - Does not alter engine scores or rankings.
 */
export function explainDispatchRecommendation(
  context: DispatchExplanationContext
): DispatchExplanation {
  return generateDispatchExplanation(context);
}

export { DEMO_SCENARIOS };

