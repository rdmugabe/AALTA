import { z } from 'zod';

// ============ ENUMS ============

export const FacilityType = {
  ASSISTED_LIVING: 'ASSISTED_LIVING',
  MEMORY_CARE: 'MEMORY_CARE',
  ADULT_FOSTER_CARE: 'ADULT_FOSTER_CARE',
  BEHAVIORAL_HEALTH: 'BEHAVIORAL_HEALTH',
  CONTINUING_CARE: 'CONTINUING_CARE',
} as const;
export type FacilityType = (typeof FacilityType)[keyof typeof FacilityType];

export const LicenseStatus = {
  ACTIVE: 'ACTIVE',
  PROVISIONAL: 'PROVISIONAL',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
  PENDING: 'PENDING',
} as const;
export type LicenseStatus = (typeof LicenseStatus)[keyof typeof LicenseStatus];

export const RiskLevel = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const OwnerType = {
  INDIVIDUAL: 'INDIVIDUAL',
  LLC: 'LLC',
  CORPORATION: 'CORPORATION',
  NONPROFIT: 'NONPROFIT',
  GOVERNMENT: 'GOVERNMENT',
  REIT: 'REIT',
  PRIVATE_EQUITY: 'PRIVATE_EQUITY',
} as const;
export type OwnerType = (typeof OwnerType)[keyof typeof OwnerType];

// ============ SCHEMAS ============

export const FacilitySchema = z.object({
  id: z.string(),
  licenseNumber: z.string(),
  name: z.string(),
  slug: z.string(),

  // Location
  address: z.string(),
  city: z.string(),
  state: z.string().default('AZ'),
  zipCode: z.string(),
  county: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),

  // Classification
  facilityType: z.nativeEnum(FacilityType),
  licenseStatus: z.nativeEnum(LicenseStatus),
  capacity: z.number().int().positive(),
  specializations: z.array(z.string()),

  // Dates
  licenseIssueDate: z.date().nullable(),
  licenseExpiryDate: z.date().nullable(),
  lastInspectionDate: z.date().nullable(),

  // Computed Scores
  complianceScore: z.number().min(0).max(100).nullable(),
  riskLevel: z.nativeEnum(RiskLevel).nullable(),
  scoreUpdatedAt: z.date().nullable(),

  // Metadata
  dataSource: z.string(),
  sourceUrl: z.string().url().nullable(),
  lastScrapedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Facility = z.infer<typeof FacilitySchema>;

export const CreateFacilitySchema = FacilitySchema.omit({
  id: true,
  slug: true,
  complianceScore: true,
  riskLevel: true,
  scoreUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateFacility = z.infer<typeof CreateFacilitySchema>;

// ============ OWNERSHIP ============

export const OwnershipSchema = z.object({
  id: z.string(),
  facilityId: z.string(),

  ownerName: z.string(),
  ownerType: z.nativeEnum(OwnerType),
  ownershipPct: z.number().min(0).max(100).nullable(),

  parentCompany: z.string().nullable(),
  corporateChain: z.array(z.string()),

  effectiveDate: z.date(),
  endDate: z.date().nullable(),
  isCurrent: z.boolean().default(true),

  sourceDocument: z.string().nullable(),
  createdAt: z.date(),
});

export type Ownership = z.infer<typeof OwnershipSchema>;

// ============ FACILITY SUMMARY (for listings) ============

export const FacilitySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  city: z.string(),
  state: z.string(),
  facilityType: z.nativeEnum(FacilityType),
  licenseStatus: z.nativeEnum(LicenseStatus),
  capacity: z.number(),
  complianceScore: z.number().nullable(),
  riskLevel: z.nativeEnum(RiskLevel).nullable(),
  violationCount: z.number(),
  lastInspectionDate: z.date().nullable(),
});

export type FacilitySummary = z.infer<typeof FacilitySummarySchema>;
