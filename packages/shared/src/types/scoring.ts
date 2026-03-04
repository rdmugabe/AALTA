import { z } from 'zod';
import { RiskLevel } from './facility';

// ============ SCORING HISTORY ============

export const ScoringHistorySchema = z.object({
  id: z.string(),
  facilityId: z.string(),

  calculatedAt: z.date(),

  complianceScore: z.number().min(0).max(100),
  violationScore: z.number(),
  complaintScore: z.number(),
  improvementScore: z.number(),

  riskLevel: z.nativeEnum(RiskLevel),

  activeViolations: z.number().int().min(0),
  repeatedViolations: z.number().int().min(0),
  recentComplaints: z.number().int().min(0),
  ownershipChanges: z.number().int().min(0),

  algorithmVersion: z.string(),
});

export type ScoringHistory = z.infer<typeof ScoringHistorySchema>;

// ============ SCORING OUTPUT ============

export const ScoreTrajectory = {
  IMPROVING: 'IMPROVING',
  STABLE: 'STABLE',
  DECLINING: 'DECLINING',
} as const;
export type ScoreTrajectory = (typeof ScoreTrajectory)[keyof typeof ScoreTrajectory];

export const ScoringOutputSchema = z.object({
  complianceScore: z.number().min(0).max(100),
  riskLevel: z.nativeEnum(RiskLevel),
  factors: z.object({
    violationScore: z.number(),
    complaintRatio: z.number(),
    improvementScore: z.number(),
    stabilityScore: z.number(),
  }),
  trajectory: z.nativeEnum(ScoreTrajectory),
});

export type ScoringOutput = z.infer<typeof ScoringOutputSchema>;

// ============ SCORING CONFIGURATION ============

export const ScoringConfigSchema = z.object({
  weights: z.object({
    violationBase: z.number().min(0).max(1),
    complaintRatio: z.number().min(0).max(1),
    improvement: z.number().min(0).max(1),
    stability: z.number().min(0).max(1),
  }),
  severityPoints: z.object({
    MINOR: z.number(),
    MODERATE: z.number(),
    MAJOR: z.number(),
    CRITICAL: z.number(),
  }),
  timeDecay: z.object({
    halfLifeMonths: z.number().positive(),
    maxAgeMonths: z.number().positive(),
  }),
  repeatMultiplier: z.number().min(1),
});

export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;

// Default scoring configuration
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    violationBase: 0.50,
    complaintRatio: 0.20,
    improvement: 0.20,
    stability: 0.10,
  },
  severityPoints: {
    MINOR: 5,
    MODERATE: 15,
    MAJOR: 35,
    CRITICAL: 60,
  },
  timeDecay: {
    halfLifeMonths: 18,
    maxAgeMonths: 36,
  },
  repeatMultiplier: 1.5,
};

// ============ DISPLAY HELPERS ============

export const RISK_LEVEL_DISPLAY: Record<RiskLevel, { label: string; color: string; description: string }> = {
  LOW: {
    label: 'Low Risk',
    color: 'green',
    description: 'Facility demonstrates consistent compliance with regulations',
  },
  MODERATE: {
    label: 'Moderate Risk',
    color: 'yellow',
    description: 'Some compliance concerns that warrant monitoring',
  },
  HIGH: {
    label: 'High Risk',
    color: 'orange',
    description: 'Significant compliance issues requiring attention',
  },
  CRITICAL: {
    label: 'Critical Risk',
    color: 'red',
    description: 'Severe compliance failures posing immediate risk to residents',
  },
};

export const TRAJECTORY_DISPLAY: Record<ScoreTrajectory, { label: string; icon: string; color: string }> = {
  IMPROVING: { label: 'Improving', icon: 'trending-up', color: 'green' },
  STABLE: { label: 'Stable', icon: 'minus', color: 'gray' },
  DECLINING: { label: 'Declining', icon: 'trending-down', color: 'red' },
};
