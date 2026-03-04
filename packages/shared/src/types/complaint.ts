import { z } from 'zod';

// ============ ENUMS ============

export const ComplaintCategory = {
  ABUSE_NEGLECT: 'ABUSE_NEGLECT',
  MEDICATION_ERROR: 'MEDICATION_ERROR',
  STAFFING_ISSUES: 'STAFFING_ISSUES',
  DIETARY_CONCERNS: 'DIETARY_CONCERNS',
  SAFETY_HAZARD: 'SAFETY_HAZARD',
  BILLING_FINANCIAL: 'BILLING_FINANCIAL',
  RIGHTS_VIOLATION: 'RIGHTS_VIOLATION',
  INFECTION_CONTROL: 'INFECTION_CONTROL',
  OTHER: 'OTHER',
} as const;
export type ComplaintCategory = (typeof ComplaintCategory)[keyof typeof ComplaintCategory];

export const ComplaintStatus = {
  RECEIVED: 'RECEIVED',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  SUBSTANTIATED: 'SUBSTANTIATED',
  UNSUBSTANTIATED: 'UNSUBSTANTIATED',
  CLOSED: 'CLOSED',
  REFERRED: 'REFERRED',
} as const;
export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];

// ============ SCHEMAS ============

export const ComplaintSchema = z.object({
  id: z.string(),
  facilityId: z.string(),

  complaintNumber: z.string().nullable(),
  category: z.nativeEnum(ComplaintCategory),
  description: z.string().nullable(),

  receivedDate: z.date(),
  investigationDate: z.date().nullable(),
  closedDate: z.date().nullable(),

  status: z.nativeEnum(ComplaintStatus),
  substantiated: z.boolean().nullable(),
  resultedInCitation: z.boolean().default(false),

  isPublicRecord: z.boolean().default(true),
  dataSource: z.string(),

  createdAt: z.date(),
});

export type Complaint = z.infer<typeof ComplaintSchema>;

export const CreateComplaintSchema = ComplaintSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateComplaint = z.infer<typeof CreateComplaintSchema>;

// ============ DISPLAY HELPERS ============

export const COMPLAINT_CATEGORY_DISPLAY: Record<ComplaintCategory, { label: string; icon: string }> = {
  ABUSE_NEGLECT: { label: 'Abuse/Neglect', icon: 'alert-triangle' },
  MEDICATION_ERROR: { label: 'Medication Error', icon: 'pill' },
  STAFFING_ISSUES: { label: 'Staffing Issues', icon: 'users' },
  DIETARY_CONCERNS: { label: 'Dietary Concerns', icon: 'utensils' },
  SAFETY_HAZARD: { label: 'Safety Hazard', icon: 'shield-alert' },
  BILLING_FINANCIAL: { label: 'Billing/Financial', icon: 'dollar-sign' },
  RIGHTS_VIOLATION: { label: 'Rights Violation', icon: 'scale' },
  INFECTION_CONTROL: { label: 'Infection Control', icon: 'virus' },
  OTHER: { label: 'Other', icon: 'circle' },
};

export const COMPLAINT_STATUS_DISPLAY: Record<ComplaintStatus, { label: string; color: string }> = {
  RECEIVED: { label: 'Received', color: 'gray' },
  UNDER_INVESTIGATION: { label: 'Under Investigation', color: 'blue' },
  SUBSTANTIATED: { label: 'Substantiated', color: 'red' },
  UNSUBSTANTIATED: { label: 'Unsubstantiated', color: 'green' },
  CLOSED: { label: 'Closed', color: 'gray' },
  REFERRED: { label: 'Referred', color: 'purple' },
};
