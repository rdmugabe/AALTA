import { describe, it, expect } from 'vitest';
import { calculateComplianceScore } from './compliance-score';

describe('calculateComplianceScore', () => {
  it('should return a perfect score for a facility with no issues', () => {
    const result = calculateComplianceScore({
      facility: {
        id: 'test-1',
        licenseStatus: 'ACTIVE',
      },
      violations: [],
      complaints: [],
      inspections: [],
      ownershipHistory: [],
    });

    expect(result.complianceScore).toBeGreaterThanOrEqual(90);
    expect(result.riskLevel).toBe('LOW');
  });

  it('should reduce score for violations', () => {
    const result = calculateComplianceScore({
      facility: {
        id: 'test-2',
        licenseStatus: 'ACTIVE',
      },
      violations: [
        {
          severity: 'MODERATE',
          citationDate: new Date(),
          status: 'CITED',
          isRepeat: false,
        },
      ],
      complaints: [],
      inspections: [],
      ownershipHistory: [],
    });

    expect(result.complianceScore).toBeLessThan(100);
    expect(result.factors.violationScore).toBeGreaterThan(0);
  });

  it('should rate critical violations as CRITICAL risk', () => {
    const result = calculateComplianceScore({
      facility: {
        id: 'test-3',
        licenseStatus: 'ACTIVE',
      },
      violations: [
        {
          severity: 'CRITICAL',
          citationDate: new Date(),
          status: 'CITED',
          isRepeat: false,
        },
      ],
      complaints: [],
      inspections: [],
      ownershipHistory: [],
    });

    expect(result.riskLevel).toBe('CRITICAL');
  });

  it('should give credit for corrected violations', () => {
    const correctionDate = new Date();
    correctionDate.setDate(correctionDate.getDate() - 15); // 15 days ago

    const citationDate = new Date();
    citationDate.setDate(citationDate.getDate() - 30); // 30 days ago

    const resultCorrected = calculateComplianceScore({
      facility: {
        id: 'test-4',
        licenseStatus: 'ACTIVE',
      },
      violations: [
        {
          severity: 'MODERATE',
          citationDate,
          correctionDate,
          status: 'CORRECTED',
          isRepeat: false,
        },
      ],
      complaints: [],
      inspections: [],
      ownershipHistory: [],
    });

    const resultUncorrected = calculateComplianceScore({
      facility: {
        id: 'test-5',
        licenseStatus: 'ACTIVE',
      },
      violations: [
        {
          severity: 'MODERATE',
          citationDate,
          status: 'CITED',
          isRepeat: false,
        },
      ],
      complaints: [],
      inspections: [],
      ownershipHistory: [],
    });

    // Corrected violation should result in better score
    expect(resultCorrected.complianceScore).toBeGreaterThan(resultUncorrected.complianceScore);
  });

  it('should penalize repeat violations', () => {
    const citationDate = new Date();

    const resultRepeat = calculateComplianceScore({
      facility: {
        id: 'test-6',
        licenseStatus: 'ACTIVE',
      },
      violations: [
        {
          severity: 'MODERATE',
          citationDate,
          status: 'CITED',
          isRepeat: true,
        },
      ],
      complaints: [],
      inspections: [],
      ownershipHistory: [],
    });

    const resultFirst = calculateComplianceScore({
      facility: {
        id: 'test-7',
        licenseStatus: 'ACTIVE',
      },
      violations: [
        {
          severity: 'MODERATE',
          citationDate,
          status: 'CITED',
          isRepeat: false,
        },
      ],
      complaints: [],
      inspections: [],
      ownershipHistory: [],
    });

    // Repeat violation should result in lower score
    expect(resultRepeat.complianceScore).toBeLessThan(resultFirst.complianceScore);
  });

  it('should calculate improvement trajectory', () => {
    const result = calculateComplianceScore({
      facility: {
        id: 'test-8',
        licenseStatus: 'ACTIVE',
      },
      violations: [],
      complaints: [],
      inspections: [],
      ownershipHistory: [],
    });

    expect(result.trajectory).toBeDefined();
    expect(['IMPROVING', 'STABLE', 'DECLINING']).toContain(result.trajectory);
  });

  it('should handle facilities with non-active license status', () => {
    const result = calculateComplianceScore({
      facility: {
        id: 'test-9',
        licenseStatus: 'PROVISIONAL',
      },
      violations: [],
      complaints: [],
      inspections: [],
      ownershipHistory: [],
    });

    expect(result.complianceScore).toBeDefined();
    expect(result.riskLevel).toBeDefined();
  });
});
