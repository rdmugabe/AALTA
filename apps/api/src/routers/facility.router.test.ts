import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Test the input validation schemas used by the facility router
describe('facility router input validation', () => {
  const listFacilitiesInput = z.object({
    query: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    facilityType: z.enum([
      'ASSISTED_LIVING',
      'MEMORY_CARE',
      'ADULT_FOSTER_CARE',
      'BEHAVIORAL_HEALTH',
      'CONTINUING_CARE',
    ]).optional(),
    licenseStatus: z.enum([
      'ACTIVE',
      'PROVISIONAL',
      'SUSPENDED',
      'REVOKED',
      'EXPIRED',
      'PENDING',
    ]).optional(),
    riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
    minScore: z.number().min(0).max(100).optional(),
    maxScore: z.number().min(0).max(100).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  });

  it('should accept valid list input', () => {
    const input = {
      query: 'Phoenix',
      facilityType: 'ASSISTED_LIVING',
      page: 1,
      limit: 20,
    };
    const result = listFacilitiesInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should apply default pagination values', () => {
    const result = listFacilitiesInput.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should reject invalid facility type', () => {
    const input = {
      facilityType: 'INVALID_TYPE',
    };
    const result = listFacilitiesInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject score outside valid range', () => {
    const input = {
      minScore: -10,
    };
    const result = listFacilitiesInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject page number less than 1', () => {
    const input = {
      page: 0,
    };
    const result = listFacilitiesInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 100', () => {
    const input = {
      limit: 150,
    };
    const result = listFacilitiesInput.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('risk level validation', () => {
  const riskLevelSchema = z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']);

  it('should accept valid risk levels', () => {
    expect(riskLevelSchema.parse('LOW')).toBe('LOW');
    expect(riskLevelSchema.parse('MODERATE')).toBe('MODERATE');
    expect(riskLevelSchema.parse('HIGH')).toBe('HIGH');
    expect(riskLevelSchema.parse('CRITICAL')).toBe('CRITICAL');
  });

  it('should reject invalid risk levels', () => {
    expect(() => riskLevelSchema.parse('UNKNOWN')).toThrow();
    expect(() => riskLevelSchema.parse('low')).toThrow(); // case-sensitive
  });
});

describe('facility type validation', () => {
  const facilityTypeSchema = z.enum([
    'ASSISTED_LIVING',
    'MEMORY_CARE',
    'ADULT_FOSTER_CARE',
    'BEHAVIORAL_HEALTH',
    'CONTINUING_CARE',
  ]);

  it('should accept all valid facility types', () => {
    const validTypes = [
      'ASSISTED_LIVING',
      'MEMORY_CARE',
      'ADULT_FOSTER_CARE',
      'BEHAVIORAL_HEALTH',
      'CONTINUING_CARE',
    ];
    validTypes.forEach((type) => {
      expect(facilityTypeSchema.parse(type)).toBe(type);
    });
  });
});
