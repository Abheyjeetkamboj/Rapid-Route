import type { ActiveEmergency, EmergencySeverity } from '../types';

export class ValidationError extends Error {
  public field: string;

  constructor(field: string, message: string) {
    super(`Validation failed for '${field}': ${message}`);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export const VALID_SEVERITIES: EmergencySeverity[] = ['Critical', 'Urgent', 'Routine'];

export const VALID_CAPABILITIES = ['BLS', 'ALS', 'ALS + Cardiac', 'ICU'];

export function validateEmergencyInput(data: Partial<ActiveEmergency>): void {
  if (!data.location || data.location.trim().length === 0) {
    throw new ValidationError('location', 'Location is required');
  }

  if (data.severity && !VALID_SEVERITIES.includes(data.severity as EmergencySeverity)) {
    throw new ValidationError('severity', `Severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
  }

  if (data.patientCount !== undefined && (data.patientCount < 1 || !Number.isInteger(data.patientCount))) {
    throw new ValidationError('patientCount', 'Patient count must be an integer greater than or equal to 1');
  }

  if (data.patientAge !== undefined && data.patientAge !== null) {
    if (data.patientAge < 0 || data.patientAge > 130) {
      throw new ValidationError('patientAge', 'Patient age must be between 0 and 130');
    }
  }

  if (data.requiredCapability && !VALID_CAPABILITIES.includes(data.requiredCapability)) {
    // Allow known capability formats or trim check
    if (data.requiredCapability.trim().length === 0) {
      throw new ValidationError('requiredCapability', 'Required capability cannot be empty');
    }
  }
}

export function validateCoordinates(lat: number, lng: number): void {
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    throw new ValidationError('lat', 'Latitude must be a valid number between -90 and 90');
  }
  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
    throw new ValidationError('lng', 'Longitude must be a valid number between -180 and 180');
  }
}

