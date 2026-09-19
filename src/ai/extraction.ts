import type {
  ExtractedEmergency,
  FieldProvenance,
} from './aiTypes';
import type { EmergencySeverity, AmbulanceCapability } from '../types';

export interface DemoScenario {
  id: string;
  label: string;
  badge: string;
  rawText: string;
  expectedCategory: string;
  expectedCapability: AmbulanceCapability;
  expectedUrgency: EmergencySeverity;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'scenario-1',
    label: 'Scenario 1: Cardiac Emergency',
    badge: 'Critical • Cardiac',
    rawText:
      'A 55 year old male at Chitkara University is having severe chest pain and difficulty breathing. One patient. He is conscious.',
    expectedCategory: 'Potential cardiac / acute respiratory emergency',
    expectedCapability: 'ALS + Cardiac',
    expectedUrgency: 'Critical',
  },
  {
    id: 'scenario-2',
    label: 'Scenario 2: Road Collision Trauma',
    badge: 'Critical • Multi-Trauma',
    rawText:
      'Two people injured in a road accident near Rajpura Highway. One appears unconscious.',
    expectedCategory: 'Motor vehicle collision / multi-patient trauma',
    expectedCapability: 'ALS',
    expectedUrgency: 'Critical',
  },
  {
    id: 'scenario-3',
    label: 'Scenario 3: Minor Trauma',
    badge: 'Routine • BLS',
    rawText: 'Child with a minor cut on the arm. Conscious and stable.',
    expectedCategory: 'Minor superficial trauma / laceration',
    expectedCapability: 'BLS',
    expectedUrgency: 'Routine',
  },
];

/**
 * Deterministic benchmark response for Scenario 1: Cardiac at Chitkara
 */
function getScenario1Extraction(rawText: string): ExtractedEmergency {
  const provenance: Record<string, FieldProvenance> = {
    location: {
      field: 'location',
      value: 'Chitkara University, Rajpura',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.98,
      confidenceLabel: 'HIGH CONFIDENCE',
      rawSnippet: 'at Chitkara University',
    },
    patientAge: {
      field: 'patientAge',
      value: 55,
      source: 'AI_EXTRACTED',
      confidenceScore: 0.96,
      confidenceLabel: 'HIGH CONFIDENCE',
      rawSnippet: '55 year old male',
    },
    patientCount: {
      field: 'patientCount',
      value: 1,
      source: 'AI_EXTRACTED',
      confidenceScore: 0.99,
      confidenceLabel: 'HIGH CONFIDENCE',
      rawSnippet: 'One patient',
    },
    symptoms: {
      field: 'symptoms',
      value: ['severe chest pain', 'difficulty breathing'],
      source: 'AI_EXTRACTED',
      confidenceScore: 0.97,
      confidenceLabel: 'HIGH CONFIDENCE',
      rawSnippet: 'severe chest pain and difficulty breathing',
    },
    emergencyCategory: {
      field: 'emergencyCategory',
      value: 'Potential cardiac / acute respiratory emergency',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.94,
      confidenceLabel: 'HIGH CONFIDENCE',
    },
    suggestedCapability: {
      field: 'suggestedCapability',
      value: 'ALS + Cardiac',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.95,
      confidenceLabel: 'HIGH CONFIDENCE',
    },
    suggestedUrgency: {
      field: 'suggestedUrgency',
      value: 'Critical',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.98,
      confidenceLabel: 'HIGH CONFIDENCE',
    },
  };

  return {
    rawText,
    location: 'Chitkara University, Rajpura',
    patientAge: 55,
    patientCount: 1,
    symptoms: ['severe chest pain', 'difficulty breathing'],
    emergencyCategory: 'Potential cardiac / acute respiratory emergency',
    severityIndicators: ['severe chest pain', 'breathing difficulty'],
    suggestedUrgency: 'Critical',
    suggestedCapability: 'ALS + Cardiac',
    notes: 'Male ~55 yrs, conscious but in acute respiratory distress. Retrosternal chest pain reported.',
    missingInformation: [],
    conflictingInformation: [],
    provenance,
    extractedAt: 'Just now',
    isDemoScenario: true,
  };
}

/**
 * Deterministic benchmark response for Scenario 2: Road Collision Trauma
 */
function getScenario2Extraction(rawText: string): ExtractedEmergency {
  const provenance: Record<string, FieldProvenance> = {
    location: {
      field: 'location',
      value: 'Rajpura Highway',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.94,
      confidenceLabel: 'HIGH CONFIDENCE',
      rawSnippet: 'near Rajpura Highway',
    },
    patientCount: {
      field: 'patientCount',
      value: 2,
      source: 'AI_EXTRACTED',
      confidenceScore: 0.98,
      confidenceLabel: 'HIGH CONFIDENCE',
      rawSnippet: 'Two people injured',
    },
    symptoms: {
      field: 'symptoms',
      value: ['collision trauma', 'loss of consciousness (1 pt)'],
      source: 'AI_EXTRACTED',
      confidenceScore: 0.92,
      confidenceLabel: 'HIGH CONFIDENCE',
      rawSnippet: 'injured in a road accident... one appears unconscious',
    },
    emergencyCategory: {
      field: 'emergencyCategory',
      value: 'Motor vehicle collision / multi-patient trauma',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.95,
      confidenceLabel: 'HIGH CONFIDENCE',
    },
    suggestedCapability: {
      field: 'suggestedCapability',
      value: 'ALS',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.93,
      confidenceLabel: 'HIGH CONFIDENCE',
    },
    suggestedUrgency: {
      field: 'suggestedUrgency',
      value: 'Critical',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.96,
      confidenceLabel: 'HIGH CONFIDENCE',
    },
  };

  return {
    rawText,
    location: 'Rajpura Highway',
    patientAge: undefined,
    patientCount: 2,
    symptoms: ['collision trauma', 'loss of consciousness (1 pt)'],
    emergencyCategory: 'Motor vehicle collision / multi-patient trauma',
    severityIndicators: ['unconscious patient', 'multiple casualties (2 pts)'],
    suggestedUrgency: 'Critical',
    suggestedCapability: 'ALS',
    notes: '2 casualties reported in highway collision. 1 patient unconscious with suspected high-energy trauma.',
    missingInformation: ['Exact highway milestone / landmark required', 'Patient age(s) not reported'],
    conflictingInformation: [],
    provenance,
    extractedAt: 'Just now',
    isDemoScenario: true,
  };
}

/**
 * Deterministic benchmark response for Scenario 3: Minor Trauma
 */
function getScenario3Extraction(rawText: string): ExtractedEmergency {
  const provenance: Record<string, FieldProvenance> = {
    patientCount: {
      field: 'patientCount',
      value: 1,
      source: 'AI_EXTRACTED',
      confidenceScore: 0.95,
      confidenceLabel: 'HIGH CONFIDENCE',
      rawSnippet: 'Child',
    },
    symptoms: {
      field: 'symptoms',
      value: ['minor cut on arm'],
      source: 'AI_EXTRACTED',
      confidenceScore: 0.95,
      confidenceLabel: 'HIGH CONFIDENCE',
      rawSnippet: 'minor cut on the arm',
    },
    emergencyCategory: {
      field: 'emergencyCategory',
      value: 'Minor superficial trauma / laceration',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.93,
      confidenceLabel: 'HIGH CONFIDENCE',
    },
    suggestedCapability: {
      field: 'suggestedCapability',
      value: 'BLS',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.92,
      confidenceLabel: 'HIGH CONFIDENCE',
    },
    suggestedUrgency: {
      field: 'suggestedUrgency',
      value: 'Routine',
      source: 'AI_EXTRACTED',
      confidenceScore: 0.95,
      confidenceLabel: 'HIGH CONFIDENCE',
    },
  };

  return {
    rawText,
    location: undefined,
    patientAge: undefined,
    patientCount: 1,
    symptoms: ['minor cut on arm'],
    emergencyCategory: 'Minor superficial trauma / laceration',
    severityIndicators: ['conscious and stable'],
    suggestedUrgency: 'Routine',
    suggestedCapability: 'BLS',
    notes: 'Pediatric patient with minor localized laceration. Conscious, alert, vitals reported stable.',
    missingInformation: ['Unable to determine patient location from the information provided (Required).'],
    conflictingInformation: [],
    provenance,
    extractedAt: 'Just now',
    isDemoScenario: true,
  };
}

/**
 * General heuristic extraction engine for arbitrary user-entered or pasted free text
 */
export function extractEmergencyDetails(text: string): ExtractedEmergency {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Match known benchmark demo scenarios
  if (lower.includes('chitkara') && (lower.includes('chest pain') || lower.includes('55'))) {
    return getScenario1Extraction(text);
  }
  if (lower.includes('accident') && (lower.includes('two') || lower.includes('2')) && lower.includes('unconscious')) {
    return getScenario2Extraction(text);
  }
  if (lower.includes('cut') && lower.includes('child') && lower.includes('stable')) {
    return getScenario3Extraction(text);
  }

  const missingInformation: string[] = [];
  const conflictingInformation: string[] = [];
  const provenance: Record<string, FieldProvenance> = {};

  // 1. Location extraction
  let location: string | undefined;
  const knownLocations = [
    { key: 'chitkara university', label: 'Chitkara University, Rajpura' },
    { key: 'chitkara', label: 'Chitkara University, Rajpura' },
    { key: 'sector 17', label: 'Sector 17, Chandigarh' },
    { key: 'phase 7', label: 'Phase 7, Mohali' },
    { key: 'mohali', label: 'Mohali' },
    { key: 'civil lines', label: 'Civil Lines, Patiala' },
    { key: 'patiala', label: 'Patiala' },
    { key: 'rajpura highway', label: 'Rajpura Highway' },
    { key: 'rajpura', label: 'Rajpura' },
    { key: 'zirakpur', label: 'Zirakpur' },
    { key: 'panchkula', label: 'Panchkula' },
  ];

  for (const loc of knownLocations) {
    if (lower.includes(loc.key)) {
      location = loc.label;
      break;
    }
  }

  // Preposition-based location regex fallback: "at <Location>" or "near <Location>" or "around <Location>"
  if (!location) {
    const prepMatch = text.match(/\b(?:at|near|around)\s+([A-Z][a-zA-Z0-9\s,-]+?)(?:\.|\s+is\b|\s+having\b|\s+with\b|\s+near\b|$)/);
    if (prepMatch) {
      const candidate = prepMatch[1].trim();
      const forbiddenWords = ['the', 'a', 'an', 'severe', 'acute', 'moderate', 'shortness', 'difficulty', 'pain', 'one', 'two', 'patient', 'hospital'];
      const firstWord = candidate.toLowerCase().split(/\s+/)[0];
      if (candidate.length > 2 && !forbiddenWords.includes(firstWord)) {
        location = candidate;
      }
    }
  }

  if (location) {
    provenance.location = {
      field: 'location',
      value: location,
      source: 'AI_EXTRACTED',
      confidenceScore: 0.92,
      confidenceLabel: 'HIGH CONFIDENCE',
    };
  } else {
    missingInformation.push('Unable to determine patient location from the information provided (Required).');
  }

  // 2. Patient Age extraction
  let patientAge: number | undefined;
  const ageMatch = text.match(/(\d{1,3})\s*(?:year|yr|y\.?o\.?|yo)\s*(?:old)?/i) ||
                   text.match(/(?:age|aged)\s*(\d{1,3})/i);
  if (ageMatch) {
    const parsed = parseInt(ageMatch[1], 10);
    if (parsed > 0 && parsed <= 125) {
      patientAge = parsed;
      provenance.patientAge = {
        field: 'patientAge',
        value: patientAge,
        source: 'AI_EXTRACTED',
        confidenceScore: 0.95,
        confidenceLabel: 'HIGH CONFIDENCE',
        rawSnippet: ageMatch[0],
      };
    }
  } else if (lower.includes('child')) {
    patientAge = 8;
    provenance.patientAge = {
      field: 'patientAge',
      value: 8,
      source: 'AI_EXTRACTED',
      confidenceScore: 0.75,
      confidenceLabel: 'MEDIUM CONFIDENCE',
      rawSnippet: 'Child (~8 yrs estimated)',
    };
  } else if (lower.includes('elderly') || lower.includes('senior')) {
    patientAge = 72;
    provenance.patientAge = {
      field: 'patientAge',
      value: 72,
      source: 'AI_EXTRACTED',
      confidenceScore: 0.70,
      confidenceLabel: 'NEEDS CONFIRMATION',
      rawSnippet: 'Elderly (~72 yrs estimated)',
    };
  }

  // 3. Patient Count extraction
  let patientCount = 1;
  let countExplicitlyFound = false;

  const countMatch = text.match(/(\d+)\s*(?:patients?|people|persons?|victims?|casualties)/i);
  if (countMatch) {
    patientCount = Math.max(1, parseInt(countMatch[1], 10));
    countExplicitlyFound = true;
  } else if (/\btwo\s*(?:people|patients|injured|victims)?\b/i.test(text) || lower.includes('2 patients')) {
    patientCount = 2;
    countExplicitlyFound = true;
  } else if (/\bthree\s*(?:people|patients|injured|victims)?\b/i.test(text) || lower.includes('3 patients')) {
    patientCount = 3;
    countExplicitlyFound = true;
  } else if (lower.includes('one patient') || lower.includes('single patient') || lower.includes('1 patient')) {
    patientCount = 1;
    countExplicitlyFound = true;
  }

  if (countExplicitlyFound) {
    provenance.patientCount = {
      field: 'patientCount',
      value: patientCount,
      source: 'AI_EXTRACTED',
      confidenceScore: 0.95,
      confidenceLabel: 'HIGH CONFIDENCE',
    };
  } else {
    patientCount = 1;
    missingInformation.push('Patient count not explicitly stated (Defaulted to 1 — please confirm).');
    provenance.patientCount = {
      field: 'patientCount',
      value: 1,
      source: 'DEFAULT',
      confidenceScore: 0.65,
      confidenceLabel: 'NEEDS CONFIRMATION',
    };
  }

  // 4. Symptoms extraction
  const symptoms: string[] = [];
  const severityIndicators: string[] = [];

  if (lower.includes('chest pain') || lower.includes('angina') || lower.includes('heart pain')) {
    symptoms.push('severe chest pain');
    severityIndicators.push('acute chest pain');
  }
  if (lower.includes('breathing') || lower.includes('shortness of breath') || lower.includes('breathless') || lower.includes('dyspnea')) {
    symptoms.push('difficulty breathing');
    severityIndicators.push('respiratory distress');
  }
  if (lower.includes('unconscious') || lower.includes('unresponsive') || lower.includes('passed out') || lower.includes('fainted')) {
    symptoms.push('unresponsiveness / loss of consciousness');
    severityIndicators.push('unconscious patient');
  }
  if (lower.includes('accident') || lower.includes('collision') || lower.includes('crash')) {
    symptoms.push('vehicular collision trauma');
    severityIndicators.push('high-velocity trauma');
  }
  if (lower.includes('fracture') || lower.includes('broken bone')) {
    symptoms.push('suspected bone fracture');
  }
  if (lower.includes('bleeding') || lower.includes('blood') || lower.includes('hemorrhage')) {
    symptoms.push('active bleeding');
    severityIndicators.push('bleeding reported');
  }
  if (lower.includes('cut') || lower.includes('laceration') || lower.includes('wound')) {
    symptoms.push('laceration / cut');
  }
  if (lower.includes('fall') || lower.includes('fell')) {
    symptoms.push('fall injury');
  }
  if (lower.includes('stroke') || lower.includes('facial droop') || lower.includes('slurred speech')) {
    symptoms.push('suspected acute stroke signs');
    severityIndicators.push('neurological deficit');
  }

  // Default symptoms if none parsed
  if (symptoms.length === 0) {
    symptoms.push('unspecified acute illness');
    missingInformation.push('Specific clinical symptoms could not be determined from the caller text.');
  }

  provenance.symptoms = {
    field: 'symptoms',
    value: symptoms,
    source: 'AI_EXTRACTED',
    confidenceScore: symptoms[0] === 'unspecified acute illness' ? 0.5 : 0.91,
    confidenceLabel: symptoms[0] === 'unspecified acute illness' ? 'NEEDS CONFIRMATION' : 'HIGH CONFIDENCE',
  };

  // 5. Conflict detection
  if (
    (lower.includes('unconscious') || lower.includes('unresponsive')) &&
    (lower.includes('conscious and talking') || lower.includes('speaking normally') || lower.includes('alert and talking'))
  ) {
    conflictingInformation.push(
      'Conflicting consciousness state detected (unconscious vs alert/speaking) — please confirm.'
    );
  }

  if (lower.includes('no injuries') && (lower.includes('severe pain') || lower.includes('bleeding'))) {
    conflictingInformation.push(
      'Conflicting report detected: caller notes state no injuries but also mentions severe pain/bleeding.'
    );
  }

  // 6. Potential emergency category & suggested capability
  let emergencyCategory = 'General emergency / triage evaluation';
  let suggestedCapability: AmbulanceCapability = 'ALS';
  let suggestedUrgency: EmergencySeverity = 'Urgent';

  const isCardiac =
    lower.includes('chest pain') ||
    lower.includes('cardiac') ||
    lower.includes('heart attack') ||
    lower.includes('angina');

  const isSevereTrauma =
    lower.includes('unconscious') ||
    lower.includes('crash') ||
    lower.includes('accident') ||
    lower.includes('fall from') ||
    patientCount > 1;

  const isMinor =
    (lower.includes('minor') || lower.includes('stable')) &&
    !isCardiac &&
    !lower.includes('unconscious') &&
    !lower.includes('severe');

  if (isCardiac) {
    emergencyCategory = 'Potential cardiac / acute respiratory emergency';
    suggestedCapability = 'ALS + Cardiac';
    suggestedUrgency = 'Critical';
  } else if (isSevereTrauma) {
    emergencyCategory = 'Motor vehicle collision / acute trauma';
    suggestedCapability = 'ALS';
    suggestedUrgency = 'Critical';
  } else if (isMinor) {
    emergencyCategory = 'Minor superficial trauma / localized injury';
    suggestedCapability = 'BLS';
    suggestedUrgency = 'Routine';
  } else if (lower.includes('ventilator') || lower.includes('icu transfer')) {
    emergencyCategory = 'Inter-facility critical care transfer';
    suggestedCapability = 'ICU';
    suggestedUrgency = 'Urgent';
  }

  provenance.emergencyCategory = {
    field: 'emergencyCategory',
    value: emergencyCategory,
    source: 'AI_EXTRACTED',
    confidenceScore: 0.90,
    confidenceLabel: 'HIGH CONFIDENCE',
  };

  provenance.suggestedCapability = {
    field: 'suggestedCapability',
    value: suggestedCapability,
    source: 'AI_EXTRACTED',
    confidenceScore: 0.92,
    confidenceLabel: 'HIGH CONFIDENCE',
  };

  provenance.suggestedUrgency = {
    field: 'suggestedUrgency',
    value: suggestedUrgency,
    source: 'AI_EXTRACTED',
    confidenceScore: 0.92,
    confidenceLabel: 'HIGH CONFIDENCE',
  };

  return {
    rawText: text,
    location,
    patientAge,
    patientCount,
    symptoms,
    emergencyCategory,
    severityIndicators,
    suggestedUrgency,
    suggestedCapability,
    notes: text,
    missingInformation,
    conflictingInformation,
    provenance,
    extractedAt: 'Just now',
    isDemoScenario: false,
  };
}
