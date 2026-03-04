import { z } from 'zod';

// ============ ENUMS ============

export const InspectionType = {
  INITIAL_LICENSURE: 'INITIAL_LICENSURE',
  ANNUAL_SURVEY: 'ANNUAL_SURVEY',
  COMPLAINT_INVESTIGATION: 'COMPLAINT_INVESTIGATION',
  FOLLOW_UP: 'FOLLOW_UP',
  FOCUSED: 'FOCUSED',
  LIFE_SAFETY: 'LIFE_SAFETY',
} as const;
export type InspectionType = (typeof InspectionType)[keyof typeof InspectionType];

export const InspectionResult = {
  NO_DEFICIENCIES: 'NO_DEFICIENCIES',
  DEFICIENCIES_CITED: 'DEFICIENCIES_CITED',
  IMMEDIATE_JEOPARDY: 'IMMEDIATE_JEOPARDY',
  SUBSTANDARD_CARE: 'SUBSTANDARD_CARE',
} as const;
export type InspectionResult = (typeof InspectionResult)[keyof typeof InspectionResult];

// ============ SCHEMAS ============

export const InspectionSchema = z.object({
  id: z.string(),
  facilityId: z.string(),

  inspectionType: z.nativeEnum(InspectionType),
  inspectionDate: z.date(),
  exitDate: z.date().nullable(),

  overallResult: z.nativeEnum(InspectionResult),
  violationCount: z.number().int().min(0).default(0),

  reportUrl: z.string().url().nullable(),
  reportDocumentId: z.string().nullable(),

  createdAt: z.date(),
});

export type Inspection = z.infer<typeof InspectionSchema>;

export const CreateInspectionSchema = InspectionSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateInspection = z.infer<typeof CreateInspectionSchema>;

// ============ DISPLAY HELPERS ============

export const INSPECTION_TYPE_DISPLAY: Record<InspectionType, { label: string; description: string }> = {
  INITIAL_LICENSURE: {
    label: 'Initial Licensure',
    description: 'First inspection when facility applies for license',
  },
  ANNUAL_SURVEY: {
    label: 'Annual Survey',
    description: 'Regular yearly compliance inspection',
  },
  COMPLAINT_INVESTIGATION: {
    label: 'Complaint Investigation',
    description: 'Investigation triggered by filed complaint',
  },
  FOLLOW_UP: {
    label: 'Follow-Up',
    description: 'Verification that previous violations were corrected',
  },
  FOCUSED: {
    label: 'Focused Survey',
    description: 'Targeted inspection on specific areas of concern',
  },
  LIFE_SAFETY: {
    label: 'Life Safety',
    description: 'Fire safety and building code compliance inspection',
  },
};

export const INSPECTION_RESULT_DISPLAY: Record<InspectionResult, { label: string; color: string }> = {
  NO_DEFICIENCIES: { label: 'No Deficiencies', color: 'green' },
  DEFICIENCIES_CITED: { label: 'Deficiencies Cited', color: 'yellow' },
  IMMEDIATE_JEOPARDY: { label: 'Immediate Jeopardy', color: 'red' },
  SUBSTANDARD_CARE: { label: 'Substandard Care', color: 'purple' },
};
