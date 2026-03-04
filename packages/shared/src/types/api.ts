import { z } from 'zod';
import { FacilityType, LicenseStatus, RiskLevel } from './facility';
import { ViolationCategory, ViolationSeverity } from './violation';

// ============ PAGINATION ============

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasMore: z.boolean(),
    }),
  });

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============ FACILITY SEARCH ============

export const FacilitySearchSchema = z.object({
  query: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  facilityType: z.nativeEnum(FacilityType).optional(),
  licenseStatus: z.nativeEnum(LicenseStatus).optional(),
  riskLevel: z.nativeEnum(RiskLevel).optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),
  hasViolations: z.boolean().optional(),
  sortBy: z.enum(['name', 'complianceScore', 'lastInspectionDate', 'violationCount']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).merge(PaginationSchema);

export type FacilitySearch = z.infer<typeof FacilitySearchSchema>;

// ============ VIOLATION FILTERS ============

export const ViolationFilterSchema = z.object({
  facilityId: z.string().optional(),
  category: z.nativeEnum(ViolationCategory).optional(),
  severity: z.nativeEnum(ViolationSeverity).optional(),
  isRepeat: z.boolean().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  sortBy: z.enum(['citationDate', 'severity', 'category']).default('citationDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).merge(PaginationSchema);

export type ViolationFilter = z.infer<typeof ViolationFilterSchema>;

// ============ API RESPONSES ============

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | { success: false; error: ApiError };

// ============ STATISTICS ============

export const FacilityStatsSchema = z.object({
  totalFacilities: z.number(),
  byType: z.record(z.nativeEnum(FacilityType), z.number()),
  byStatus: z.record(z.nativeEnum(LicenseStatus), z.number()),
  byRiskLevel: z.record(z.nativeEnum(RiskLevel), z.number()),
  averageScore: z.number(),
  totalViolations: z.number(),
  totalComplaints: z.number(),
});

export type FacilityStats = z.infer<typeof FacilityStatsSchema>;
