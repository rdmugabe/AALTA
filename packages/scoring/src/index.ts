export {
  calculateComplianceScore,
  type ScoringInput,
  type ScoringFactors,
  ALGORITHM_VERSION,
} from './compliance-score';

// Re-export types from shared for convenience
export {
  type ScoringOutput,
  type ScoringConfig,
  type ScoreTrajectory,
  DEFAULT_SCORING_CONFIG,
  RISK_LEVEL_DISPLAY,
  TRAJECTORY_DISPLAY,
} from '@aalta/shared';
