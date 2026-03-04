import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

// Input schemas
const listFacilitiesInput = z.object({
  query: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
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
  sortBy: z.enum(['name', 'complianceScore', 'lastInspectionDate', 'city']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const getFacilityInput = z.object({
  slug: z.string(),
});

const getFacilityByIdInput = z.object({
  id: z.string(),
});

export const facilityRouter = router({
  // List facilities with filtering, pagination, and sorting
  list: publicProcedure
    .input(listFacilitiesInput)
    .query(async ({ ctx, input }) => {
      const { page, limit, sortBy, sortOrder, ...filters } = input;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {};

      if (filters.query) {
        where.OR = [
          { name: { contains: filters.query, mode: 'insensitive' } },
          { licenseNumber: { contains: filters.query, mode: 'insensitive' } },
          { city: { contains: filters.query, mode: 'insensitive' } },
        ];
      }

      if (filters.state) where.state = filters.state;
      if (filters.city) where.city = { equals: filters.city, mode: 'insensitive' };
      if (filters.county) where.county = { equals: filters.county, mode: 'insensitive' };
      if (filters.facilityType) where.facilityType = filters.facilityType;
      if (filters.licenseStatus) where.licenseStatus = filters.licenseStatus;
      if (filters.riskLevel) where.riskLevel = filters.riskLevel;

      if (filters.minScore !== undefined || filters.maxScore !== undefined) {
        where.complianceScore = {
          ...(filters.minScore !== undefined && { gte: filters.minScore }),
          ...(filters.maxScore !== undefined && { lte: filters.maxScore }),
        };
      }

      // Execute queries in parallel
      const [facilities, total] = await Promise.all([
        ctx.prisma.facility.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            licenseNumber: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            facilityType: true,
            licenseStatus: true,
            capacity: true,
            complianceScore: true,
            riskLevel: true,
            lastInspectionDate: true,
            _count: {
              select: {
                violations: true,
              },
            },
          },
        }),
        ctx.prisma.facility.count({ where }),
      ]);

      return {
        items: facilities.map((f) => ({
          ...f,
          complianceScore: f.complianceScore?.toNumber() ?? null,
          violationCount: f._count.violations,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + facilities.length < total,
        },
      };
    }),

  // Get facility by slug
  getBySlug: publicProcedure
    .input(getFacilityInput)
    .query(async ({ ctx, input }) => {
      const facility = await ctx.prisma.facility.findUnique({
        where: { slug: input.slug },
        include: {
          ownership: {
            where: { isCurrent: true },
          },
          violations: {
            orderBy: { citationDate: 'desc' },
            take: 10,
          },
          inspections: {
            orderBy: { inspectionDate: 'desc' },
            take: 5,
          },
          complaints: {
            orderBy: { receivedDate: 'desc' },
            take: 5,
          },
          scoringHistory: {
            orderBy: { calculatedAt: 'desc' },
            take: 12,
          },
        },
      });

      if (!facility) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Facility not found',
        });
      }

      return {
        ...facility,
        complianceScore: facility.complianceScore?.toNumber() ?? null,
        latitude: facility.latitude?.toNumber() ?? null,
        longitude: facility.longitude?.toNumber() ?? null,
      };
    }),

  // Get facility by ID
  getById: publicProcedure
    .input(getFacilityByIdInput)
    .query(async ({ ctx, input }) => {
      const facility = await ctx.prisma.facility.findUnique({
        where: { id: input.id },
        include: {
          ownership: {
            where: { isCurrent: true },
          },
          _count: {
            select: {
              violations: true,
              inspections: true,
              complaints: true,
            },
          },
        },
      });

      if (!facility) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Facility not found',
        });
      }

      return {
        ...facility,
        complianceScore: facility.complianceScore?.toNumber() ?? null,
      };
    }),

  // Get violations for a facility
  getViolations: publicProcedure
    .input(z.object({
      facilityId: z.string(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const [violations, total] = await Promise.all([
        ctx.prisma.violation.findMany({
          where: { facilityId: input.facilityId },
          orderBy: { citationDate: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.violation.count({
          where: { facilityId: input.facilityId },
        }),
      ]);

      return {
        items: violations,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
          hasMore: skip + violations.length < total,
        },
      };
    }),

  // Get statistics
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [
      totalFacilities,
      byType,
      byStatus,
      byRiskLevel,
      avgScore,
      totalViolations,
      totalComplaints,
    ] = await Promise.all([
      ctx.prisma.facility.count(),
      ctx.prisma.facility.groupBy({
        by: ['facilityType'],
        _count: true,
      }),
      ctx.prisma.facility.groupBy({
        by: ['licenseStatus'],
        _count: true,
      }),
      ctx.prisma.facility.groupBy({
        by: ['riskLevel'],
        _count: true,
      }),
      ctx.prisma.facility.aggregate({
        _avg: { complianceScore: true },
      }),
      ctx.prisma.violation.count(),
      ctx.prisma.complaint.count(),
    ]);

    return {
      totalFacilities,
      byType: Object.fromEntries(byType.map((t) => [t.facilityType, t._count])),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.licenseStatus, s._count])),
      byRiskLevel: Object.fromEntries(
        byRiskLevel
          .filter((r) => r.riskLevel !== null)
          .map((r) => [r.riskLevel!, r._count])
      ),
      averageScore: avgScore._avg.complianceScore?.toNumber() ?? 0,
      totalViolations,
      totalComplaints,
    };
  }),

  // Get cities with facility counts
  getCities: publicProcedure
    .input(z.object({ state: z.string().default('AZ') }))
    .query(async ({ ctx, input }) => {
      const cities = await ctx.prisma.facility.groupBy({
        by: ['city'],
        where: { state: input.state },
        _count: true,
        orderBy: { _count: { city: 'desc' } },
      });

      return cities.map((c) => ({
        name: c.city,
        count: c._count,
      }));
    }),
});
