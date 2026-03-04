import {
  type Facility,
  type Violation,
  type Complaint,
  type Inspection,
  type Ownership,
  type RiskLevel,
  type ScoringOutput,
  type ScoringConfig,
  type ScoreTrajectory,
  DEFAULT_SCORING_CONFIG,
  ViolationSeverity,
  monthsBetween,
  daysBetween,
  isWithinMonths,
  ALGORITHM_VERSION,
} from '@aalta/shared';

// ============ INPUT TYPES ============

export interface ScoringInput {
  facility: Facility;
  violations: Violation[];
  complaints: Complaint[];
  inspections: Inspection[];
  ownershipHistory: Ownership[];
}

export interface ScoringFactors {
  violationScore: number;
  complaintRatio: number;
  improvementScore: number;
  stabilityScore: number;
}

// ============ MAIN SCORING FUNCTION ============

export function calculateComplianceScore(
  input: ScoringInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): ScoringOutput {
  const violationScore = calculateViolationScore(input.violations, config);
  const complaintRatio = calculateComplaintRatio(input.complaints, input.inspections);
  const improvementScore = calculateImprovementTrajectory(input.violations, config);
  const stabilityScore = calculateStabilityScore(input.ownershipHistory, input.facility);

  // Weighted combination (raw score is penalty-based, higher = worse)
  const rawScore =
    violationScore * config.weights.violationBase +
    complaintRatio * config.weights.complaintRatio +
    improvementScore * config.weights.improvement +
    stabilityScore * config.weights.stability;

  // Normalize to 0-100 (higher = better)
  const complianceScore = Math.max(0, Math.min(100, 100 - rawScore));

  return {
    complianceScore,
    riskLevel: determineRiskLevel(complianceScore, input),
    factors: {
      violationScore,
      complaintRatio,
      improvementScore,
      stabilityScore,
    },
    trajectory: determineTrajectory(input.violations),
  };
}

// ============ VIOLATION SCORING ============

function calculateViolationScore(violations: Violation[], config: ScoringConfig): number {
  const now = new Date();

  return violations.reduce((total, v) => {
    // Base severity points
    let points = config.severityPoints[v.severity as keyof typeof config.severityPoints];

    // Apply repeat multiplier
    if (v.isRepeat) {
      points *= config.repeatMultiplier;
    }

    // Apply time decay
    const ageMonths = monthsBetween(v.citationDate, now);
    const decayFactor = Math.pow(0.5, ageMonths / config.timeDecay.halfLifeMonths);
    points *= Math.max(0.1, decayFactor); // Minimum 10% weight

    // Credit for correction
    if (v.status === 'CORRECTED' && v.correctionDate) {
      const correctionSpeed = daysBetween(v.citationDate, v.correctionDate);
      if (correctionSpeed <= 30) {
        points *= 0.5; // 50% reduction for quick fix
      } else if (correctionSpeed <= 60) {
        points *= 0.7; // 30% reduction
      } else if (correctionSpeed <= 90) {
        points *= 0.85; // 15% reduction
      }
    }

    return total + points;
  }, 0);
}

// ============ COMPLAINT RATIO ============

function calculateComplaintRatio(complaints: Complaint[], inspections: Inspection[]): number {
  const recentComplaints = complaints.filter((c) => isWithinMonths(c.receivedDate, 24));
  const recentInspections = inspections.filter((i) => isWithinMonths(i.inspectionDate, 24));

  // Substantiated complaints are weighted more heavily
  const weightedComplaints = recentComplaints.reduce((sum, c) => {
    if (c.substantiated === true) return sum + 2;
    if (c.substantiated === false) return sum + 0.5;
    return sum + 1; // Unknown status
  }, 0);

  // Normalize: expect ~1 complaint per inspection as baseline
  const ratio = weightedComplaints / Math.max(recentInspections.length, 1);

  return Math.min(ratio * 20, 50); // Cap at 50 points
}

// ============ IMPROVEMENT TRAJECTORY ============

function calculateImprovementTrajectory(violations: Violation[], config: ScoringConfig): number {
  const now = new Date();

  // Split violations into recent (last 12 months) and older (12-24 months)
  const recentViolations = violations.filter((v) => {
    const ageMonths = monthsBetween(v.citationDate, now);
    return ageMonths <= 12;
  });

  const olderViolations = violations.filter((v) => {
    const ageMonths = monthsBetween(v.citationDate, now);
    return ageMonths > 12 && ageMonths <= 24;
  });

  // Calculate severity-weighted counts
  const recentWeight = recentViolations.reduce(
    (sum, v) => sum + config.severityPoints[v.severity as keyof typeof config.severityPoints],
    0
  );
  const olderWeight = olderViolations.reduce(
    (sum, v) => sum + config.severityPoints[v.severity as keyof typeof config.severityPoints],
    0
  );

  // If older weight is 0, we can't determine trajectory
  if (olderWeight === 0) {
    return recentWeight > 0 ? 10 : 0; // Neutral
  }

  // Calculate change ratio
  const changeRatio = (recentWeight - olderWeight) / olderWeight;

  // Convert to score: negative change (improvement) = lower score
  // Scale: -50% or better = 0, +50% or worse = 30
  const improvementScore = Math.max(0, Math.min(30, (changeRatio + 0.5) * 30));

  return improvementScore;
}

// ============ STABILITY SCORE ============

function calculateStabilityScore(ownershipHistory: Ownership[], facility: Facility): number {
  let score = 0;

  // Check for recent ownership changes (last 24 months)
  const recentChanges = ownershipHistory.filter(
    (o) => !o.isCurrent && o.endDate && isWithinMonths(o.endDate, 24)
  );

  // Each ownership change adds 5 points
  score += recentChanges.length * 5;

  // License status penalties
  if (facility.licenseStatus === 'PROVISIONAL') {
    score += 10;
  } else if (facility.licenseStatus === 'SUSPENDED') {
    score += 25;
  } else if (facility.licenseStatus === 'REVOKED') {
    score += 40;
  }

  // Cap at 40
  return Math.min(score, 40);
}

// ============ RISK LEVEL ============

function determineRiskLevel(score: number, input: ScoringInput): RiskLevel {
  // Critical violations override score
  const hasCritical = input.violations.some(
    (v) => v.severity === ViolationSeverity.CRITICAL && isWithinMonths(v.citationDate, 12)
  );
  if (hasCritical) return 'CRITICAL';

  // Multiple recent major violations
  const recentMajor = input.violations.filter(
    (v) => v.severity === ViolationSeverity.MAJOR && isWithinMonths(v.citationDate, 12)
  );
  if (recentMajor.length >= 3) return 'HIGH';

  // Score-based determination
  if (score >= 85) return 'LOW';
  if (score >= 65) return 'MODERATE';
  if (score >= 40) return 'HIGH';
  return 'CRITICAL';
}

// ============ TRAJECTORY ============

function determineTrajectory(violations: Violation[]): ScoreTrajectory {
  const now = new Date();

  const recentCount = violations.filter((v) => {
    const ageMonths = monthsBetween(v.citationDate, now);
    return ageMonths <= 12;
  }).length;

  const olderCount = violations.filter((v) => {
    const ageMonths = monthsBetween(v.citationDate, now);
    return ageMonths > 12 && ageMonths <= 24;
  }).length;

  if (olderCount === 0 && recentCount === 0) return 'STABLE';

  const changeRatio = olderCount > 0 ? (recentCount - olderCount) / olderCount : recentCount > 0 ? 1 : 0;

  if (changeRatio <= -0.25) return 'IMPROVING';
  if (changeRatio >= 0.25) return 'DECLINING';
  return 'STABLE';
}

// ============ EXPORTS ============

export { ALGORITHM_VERSION };
