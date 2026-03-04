import { z } from 'zod';

// ============ ENUMS ============

export const ViolationCategory = {
  RESIDENT_RIGHTS: 'RESIDENT_RIGHTS',
  QUALITY_OF_CARE: 'QUALITY_OF_CARE',
  MEDICATION_MANAGEMENT: 'MEDICATION_MANAGEMENT',
  STAFFING: 'STAFFING',
  PHYSICAL_ENVIRONMENT: 'PHYSICAL_ENVIRONMENT',
  INFECTION_CONTROL: 'INFECTION_CONTROL',
  EMERGENCY_PREPAREDNESS: 'EMERGENCY_PREPAREDNESS',
  DIETARY_SERVICES: 'DIETARY_SERVICES',
  ADMINISTRATION: 'ADMINISTRATION',
  RECORDS_DOCUMENTATION: 'RECORDS_DOCUMENTATION',
} as const;
export type ViolationCategory = (typeof ViolationCategory)[keyof typeof ViolationCategory];

export const ViolationSeverity = {
  MINOR: 'MINOR',
  MODERATE: 'MODERATE',
  MAJOR: 'MAJOR',
  CRITICAL: 'CRITICAL',
} as const;
export type ViolationSeverity = (typeof ViolationSeverity)[keyof typeof ViolationSeverity];

export const ViolationStatus = {
  CITED: 'CITED',
  UNDER_CORRECTION: 'UNDER_CORRECTION',
  CORRECTED: 'CORRECTED',
  DISPUTED: 'DISPUTED',
  APPEALED: 'APPEALED',
  WAIVED: 'WAIVED',
} as const;
export type ViolationStatus = (typeof ViolationStatus)[keyof typeof ViolationStatus];

// ============ SCHEMAS ============

export const ViolationSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  inspectionId: z.string().nullable(),

  violationCode: z.string(),
  category: z.nativeEnum(ViolationCategory),
  description: z.string(),
  severity: z.nativeEnum(ViolationSeverity),

  regulationCitation: z.string().nullable(),
  cfrReference: z.string().nullable(),

  citationDate: z.date(),
  correctionDueDate: z.date().nullable(),
  correctionDate: z.date().nullable(),
  status: z.nativeEnum(ViolationStatus),

  isRepeat: z.boolean().default(false),
  previousViolationId: z.string().nullable(),

  severityScore: z.number(),
  weightedScore: z.number().nullable(),

  sourceDocumentId: z.string().nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Violation = z.infer<typeof ViolationSchema>;

export const CreateViolationSchema = ViolationSchema.omit({
  id: true,
  weightedScore: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateViolation = z.infer<typeof CreateViolationSchema>;

// ============ SEVERITY DISPLAY ============

export const SEVERITY_DISPLAY: Record<ViolationSeverity, { label: string; color: string }> = {
  MINOR: { label: 'Minor', color: 'yellow' },
  MODERATE: { label: 'Moderate', color: 'orange' },
  MAJOR: { label: 'Major', color: 'red' },
  CRITICAL: { label: 'Critical', color: 'purple' },
};

export const CATEGORY_DISPLAY: Record<ViolationCategory, { label: string; icon: string }> = {
  RESIDENT_RIGHTS: { label: 'Resident Rights', icon: 'shield' },
  QUALITY_OF_CARE: { label: 'Quality of Care', icon: 'heart' },
  MEDICATION_MANAGEMENT: { label: 'Medication Management', icon: 'pill' },
  STAFFING: { label: 'Staffing', icon: 'users' },
  PHYSICAL_ENVIRONMENT: { label: 'Physical Environment', icon: 'building' },
  INFECTION_CONTROL: { label: 'Infection Control', icon: 'virus' },
  EMERGENCY_PREPAREDNESS: { label: 'Emergency Preparedness', icon: 'alert' },
  DIETARY_SERVICES: { label: 'Dietary Services', icon: 'utensils' },
  ADMINISTRATION: { label: 'Administration', icon: 'clipboard' },
  RECORDS_DOCUMENTATION: { label: 'Records & Documentation', icon: 'file' },
};
