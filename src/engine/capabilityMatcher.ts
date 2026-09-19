import type { AmbulanceCapability } from '../types';

/* =========================================================
   CAPABILITY MATCHER — CENTRALIZED CLINICAL RULES
   ========================================================= */

export type MatchTier = 'EXACT' | 'STRONG' | 'PARTIAL' | 'INCOMPATIBLE';

export interface CapabilityMatchResult {
  isSuitable: boolean;
  score: number;
  matchTier: MatchTier;
  reason: string;
}

/**
 * Normalizes capability strings to canonical form for evaluation.
 */
export function normalizeCapability(raw: string): string {
  const clean = raw.trim().toLowerCase();
  if (clean.includes('cardiac')) return 'ALS + Cardiac';
  if (clean.includes('icu') || clean.includes('intensive')) return 'ICU';
  if (clean.includes('als') || clean.includes('advanced')) return 'ALS';
  if (clean.includes('bls') || clean.includes('basic')) return 'BLS';
  return raw.trim();
}

/**
 * Determines if an emergency involves acute cardiac symptoms.
 */
export function isCardiacEmergency(emergencyType: string, requiredCapability?: string): boolean {
  const text = `${emergencyType} ${requiredCapability || ''}`.toLowerCase();
  return (
    text.includes('cardiac') ||
    text.includes('chest pain') ||
    text.includes('heart attack') ||
    text.includes('myocardial') ||
    text.includes('arrest')
  );
}

/**
 * Evaluates whether an ambulance's medical tier satisfies incident requirements.
 *
 * Rules:
 * - Exact match yields score 100.
 * - Higher tier handling lower tier (e.g. ICU handling ALS, or ALS+Cardiac handling ALS) is suitable and yields score 80 (STRONG).
 * - Partial compatibility yields score 50.
 * - Incompatible yields score 0 and isSuitable = false.
 * - BLS CANNOT handle ALS, Cardiac, or ICU requirements.
 * - Cardiac emergencies strictly require ALS + Cardiac or ICU (with cardiac kit).
 * - ICU requirements strictly require ICU.
 */
export function evaluateCapabilityMatch(
  requiredCapRaw: string,
  ambulanceCapRaw: AmbulanceCapability | string,
  emergencyType: string = '',
  severity: string = ''
): CapabilityMatchResult {
  const req = normalizeCapability(requiredCapRaw);
  const amb = normalizeCapability(ambulanceCapRaw);
  const cardiac = isCardiacEmergency(emergencyType, requiredCapRaw);

  // Exact capability match
  if (req === amb) {
    return {
      isSuitable: true,
      score: 100,
      matchTier: 'EXACT',
      reason: `Exact medical capability match (${amb})`,
    };
  }

  // Cardiac Emergency Requirements
  if (cardiac || req === 'ALS + Cardiac') {
    if (amb === 'ALS + Cardiac') {
      return {
        isSuitable: true,
        score: 100,
        matchTier: 'EXACT',
        reason: 'Equipped with 12-lead ECG, cardiac defibrillator, and telemetry',
      };
    }
    if (amb === 'ICU') {
      return {
        isSuitable: true,
        score: 80,
        matchTier: 'STRONG',
        reason: 'Mobile ICU possesses advanced resuscitation & cardiac life support capacity',
      };
    }
    // Standard ALS or BLS without cardiac monitoring is unsuitable for cardiac emergencies
    return {
      isSuitable: false,
      score: 0,
      matchTier: 'INCOMPATIBLE',
      reason: `Lacks specialized cardiac defibrillation/monitoring telemetry (${amb} unit)`,
    };
  }

  // ICU / Critical Care Requirements
  if (req === 'ICU') {
    if (amb === 'ICU') {
      return {
        isSuitable: true,
        score: 100,
        matchTier: 'EXACT',
        reason: 'Mobile ICU certified with ventilator and infusion pumps',
      };
    }
    return {
      isSuitable: false,
      score: 0,
      matchTier: 'INCOMPATIBLE',
      reason: `Requires Mobile ICU ventilator equipment (unit is ${amb})`,
    };
  }

  // ALS Requirements (Urgent / Advanced Life Support)
  if (req === 'ALS') {
    if (amb === 'ALS') {
      return {
        isSuitable: true,
        score: 100,
        matchTier: 'EXACT',
        reason: 'Advanced Life Support certified crew and pharmacotherapy kit',
      };
    }
    if (amb === 'ALS + Cardiac') {
      return {
        isSuitable: true,
        score: 80,
        matchTier: 'STRONG',
        reason: 'Possesses full ALS capability plus extra cardiac monitoring equipment',
      };
    }
    if (amb === 'ICU') {
      return {
        isSuitable: true,
        score: 80,
        matchTier: 'STRONG',
        reason: 'High-acuity ICU unit exceeds standard ALS parameters',
      };
    }
    // BLS cannot handle ALS
    return {
      isSuitable: false,
      score: 0,
      matchTier: 'INCOMPATIBLE',
      reason: 'BLS unit lacks paramedic credentials and ALS airway/IV equipment',
    };
  }

  // BLS Requirements (Basic / Routine non-emergent)
  if (req === 'BLS') {
    if (amb === 'BLS') {
      return {
        isSuitable: true,
        score: 100,
        matchTier: 'EXACT',
        reason: 'Basic Life Support unit appropriately sized for routine transfer',
      };
    }
    if (amb === 'ALS' || amb === 'ALS + Cardiac' || amb === 'ICU') {
      return {
        isSuitable: true,
        score: 80,
        matchTier: 'STRONG',
        reason: `Higher capability tier (${amb}) deployed for basic life support need`,
      };
    }
  }

  // Fallback check based on severity
  const sevLower = severity.toLowerCase();
  if (sevLower === 'critical' && (amb === 'BLS')) {
    return {
      isSuitable: false,
      score: 0,
      matchTier: 'INCOMPATIBLE',
      reason: 'BLS unit insufficient for high-acuity critical triage emergency',
    };
  }

  return {
    isSuitable: true,
    score: 50,
    matchTier: 'PARTIAL',
    reason: `Compatible operational tier (${amb})`,
  };
}

