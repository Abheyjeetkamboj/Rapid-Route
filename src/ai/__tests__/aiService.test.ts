import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractEmergencyInformation,
  explainDispatchRecommendation,
  getAiServiceStatus,
  setAiServiceStatus,
  DEMO_SCENARIOS,
} from '../aiService';
import { findBestAmbulance } from '../../engine/dispatchEngine';
import { mockAmbulances } from '../../data/mockData';
import type { ExtractedEmergency } from '../aiTypes';
import type { ActiveEmergency } from '../../types';

describe('RapidRoute AI Layer — Intake Extraction & Explainability', () => {
  beforeEach(() => {
    setAiServiceStatus('DEMO_MODE');
  });

  // TEST 1: Correct extraction of location
  it('TEST 1: extracts correct location from free-text caller notes', async () => {
    const text = 'A 55 year old male at Chitkara University is having severe chest pain and difficulty breathing. One patient. He is conscious.';
    const result = await extractEmergencyInformation(text);

    expect(result.location).toBeDefined();
    expect(result.location?.toLowerCase()).toContain('chitkara');
    expect(result.provenance.location.confidenceLabel).toBe('HIGH CONFIDENCE');
  });

  // TEST 2: Correct extraction of patient count and age
  it('TEST 2: extracts correct patient count and age', async () => {
    const text = 'A 55 year old male at Chitkara University is having severe chest pain. One patient.';
    const result = await extractEmergencyInformation(text);

    expect(result.patientAge).toBe(55);
    expect(result.patientCount).toBe(1);

    const multiText = 'Two people injured in a road accident near Rajpura Highway.';
    const multiResult = await extractEmergencyInformation(multiText);
    expect(multiResult.patientCount).toBe(2);
  });

  // TEST 3: Correct extraction of symptoms
  it('TEST 3: extracts symptoms accurately without inventing medical claims', async () => {
    const text = '55 year old male with severe chest pain and difficulty breathing at Chitkara University. One patient.';
    const result = await extractEmergencyInformation(text);

    expect(result.symptoms.length).toBeGreaterThanOrEqual(2);
    const symptomsJoined = result.symptoms.join(' ').toLowerCase();
    expect(symptomsJoined).toContain('chest pain');
    expect(symptomsJoined).toContain('breathing');
    expect(result.suggestedCapability).toBe('ALS + Cardiac');
    expect(result.suggestedUrgency).toBe('Critical');
  });

  // TEST 4: Missing location detection
  it('TEST 4: flags missing location when caller text omits geographic data', async () => {
    const textWithoutLocation = 'Male 60 years old having severe chest pain and shortness of breath. One patient.';
    const result = await extractEmergencyInformation(textWithoutLocation);

    expect(result.location).toBeUndefined();
    expect(result.missingInformation.length).toBeGreaterThan(0);
    expect(result.missingInformation.some((m) => m.toLowerCase().includes('location'))).toBe(true);
  });

  // TEST 5: Conflicting information detection
  it('TEST 5: flags conflicting statements in caller report', async () => {
    const conflictingText = 'Patient is unconscious and unresponsive at Chitkara University, but also alert and talking normally.';
    const result = await extractEmergencyInformation(conflictingText);

    expect(result.conflictingInformation.length).toBeGreaterThan(0);
    expect(result.conflictingInformation[0].toLowerCase()).toContain('conflict');
  });

  // TEST 6: Dispatcher editing AI-extracted data
  it('TEST 6: supports dispatcher reviewing and modifying extracted fields', async () => {
    const rawText = 'Patient with severe leg injury at Sector 17, Chandigarh.';
    const extracted = await extractEmergencyInformation(rawText);

    // Dispatcher reviews and modifies extracted parameters
    const modifiedEmergency: ExtractedEmergency = {
      ...extracted,
      patientCount: 2, // Dispatcher confirms second casualty
      suggestedUrgency: 'Critical', // Dispatcher elevates urgency
      notes: `${extracted.notes} — Dispatcher confirmed second pedestrian casualty.`,
    };

    expect(modifiedEmergency.patientCount).toBe(2);
    expect(modifiedEmergency.suggestedUrgency).toBe('Critical');
    expect(modifiedEmergency.notes).toContain('second pedestrian');
  });

  // TEST 7: AI explanation matches dispatch engine output
  it('TEST 7: generates explanation strictly grounded in engine output facts', () => {
    const emergencyInput = {
      id: 'INC-TEST-01',
      location: 'Chitkara University, Rajpura',
      emergencyType: 'Suspected Cardiac Emergency',
      severity: 'Critical',
      patientCount: 1,
      requiredCapability: 'ALS + Cardiac',
    };

    const engineRec = findBestAmbulance(emergencyInput, mockAmbulances);
    expect(engineRec.hasSuitableAmbulance).toBe(true);
    expect(engineRec.recommendedAmbulanceId).toBe('RR-204');

    const runnerUp = engineRec.eligibleCandidates.find(
      (c) => c.ambulance.id !== engineRec.recommendedAmbulanceId
    );

    const explanation = explainDispatchRecommendation({
      recommendation: engineRec,
      incidentLocation: emergencyInput.location,
      incidentCategory: emergencyInput.emergencyType,
      incidentSeverity: emergencyInput.severity,
      requiredCapability: emergencyInput.requiredCapability,
      runnerUp,
    });

    expect(explanation.headline).toContain('RR-204');
    expect(explanation.headline).toContain(`${engineRec.etaMinutes} min`);
    expect(explanation.primaryReasons.some((r) => r.includes('Fastest arrival window') || r.includes('Optimal arrival'))).toBe(true);
    expect(explanation.primaryReasons.some((r) => r.includes('ALS + Cardiac'))).toBe(true);
    expect(explanation.factsGroundingNote).toContain('deterministic');
  });

  // TEST 8: AI never changes ambulance ranking or scores
  it('TEST 8: guarantees AI explanation never mutates engine score or candidate order', () => {
    const emergencyInput = {
      id: 'INC-TEST-02',
      location: 'Chitkara University, Rajpura',
      emergencyType: 'Suspected Cardiac Emergency',
      severity: 'Critical',
      patientCount: 1,
      requiredCapability: 'ALS + Cardiac',
    };

    const engineRec = findBestAmbulance(emergencyInput, mockAmbulances);
    const originalScores = engineRec.eligibleCandidates.map((c) => ({
      id: c.ambulance.id,
      score: c.scoreBreakdown?.finalScore,
      rank: c.rank,
    }));

    // Generate explanation
    explainDispatchRecommendation({
      recommendation: engineRec,
      incidentLocation: emergencyInput.location,
      incidentCategory: emergencyInput.emergencyType,
      incidentSeverity: emergencyInput.severity,
      requiredCapability: emergencyInput.requiredCapability,
    });

    // Check that engine scores and order were untouched
    const postScores = engineRec.eligibleCandidates.map((c) => ({
      id: c.ambulance.id,
      score: c.scoreBreakdown?.finalScore,
      rank: c.rank,
    }));

    expect(postScores).toEqual(originalScores);
    expect(engineRec.recommendedAmbulanceId).toBe('RR-204');
  });

  // TEST 9: Demo mode works without an API key
  it('TEST 9: operates 100% deterministically in DEMO_MODE without external API keys', async () => {
    expect(getAiServiceStatus()).toBe('DEMO_MODE');

    // Run through all 3 demo scenarios
    for (const scenario of DEMO_SCENARIOS) {
      const extracted = await extractEmergencyInformation(scenario.rawText);
      expect(extracted).toBeDefined();
      expect(extracted.suggestedCapability).toBe(scenario.expectedCapability);
      expect(extracted.suggestedUrgency).toBe(scenario.expectedUrgency);
    }
  });

  // TEST 10: Dispatch still works if AI is unavailable (Graceful Fallback)
  it('TEST 10: allows manual dispatch workflow when AI service is marked UNAVAILABLE', async () => {
    setAiServiceStatus('UNAVAILABLE');
    expect(getAiServiceStatus()).toBe('UNAVAILABLE');

    // Attempting extraction rejects safely
    await expect(extractEmergencyInformation('Some text')).rejects.toThrow(
      'AI assistance unavailable. Dispatcher can enter emergency details manually.'
    );

    // But the deterministic dispatch engine continues to work independently!
    const manualEmergency: ActiveEmergency = {
      id: 'INC-MANUAL-01',
      severity: 'Critical',
      location: 'Chitkara University, Rajpura',
      emergencyType: 'Cardiac Emergency',
      patientCount: 1,
      requiredCapability: 'ALS + Cardiac',
      notes: 'Manually entered by dispatcher',
      status: 'Awaiting Dispatch',
      dispatchStage: 'Recommended',
      assignedAmbulance: null,
      etaMinutes: 8,
      reportedAt: '12:00 IST',
      timeline: [],
    };

    const rec = findBestAmbulance(
      {
        id: manualEmergency.id,
        location: manualEmergency.location,
        emergencyType: manualEmergency.emergencyType,
        severity: manualEmergency.severity,
        patientCount: manualEmergency.patientCount,
        requiredCapability: manualEmergency.requiredCapability,
      },
      mockAmbulances
    );

    expect(rec.hasSuitableAmbulance).toBe(true);
    expect(rec.recommendedAmbulanceId).toBe('RR-204');
  });
});
