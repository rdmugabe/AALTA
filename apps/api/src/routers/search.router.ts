import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { searchService } from '../services/search.service';
import { prisma } from '../db/client';

const searchInput = z.object({
  query: z.string().min(2),
  limit: z.number().int().min(1).max(20).default(10),
});

export const searchRouter = router({
  // Quick search for autocomplete - uses Meilisearch
  quickSearch: publicProcedure
    .input(searchInput)
    .query(async ({ input }) => {
      try {
        const result = await searchService.searchFacilities(input.query, {
          limit: input.limit,
        });

        return result.hits.map((hit) => ({
          id: hit.id,
          name: hit.name,
          slug: hit.slug,
          city: hit.city,
          state: hit.state,
          facilityType: hit.facilityType,
          complianceScore: hit.complianceScore,
        }));
      } catch (error) {
        // Fallback to database search if Meilisearch is unavailable
        console.error('Meilisearch error, falling back to database:', error);
        const facilities = await prisma.facility.findMany({
          where: {
            OR: [
              { name: { contains: input.query, mode: 'insensitive' } },
              { city: { contains: input.query, mode: 'insensitive' } },
              { licenseNumber: { contains: input.query, mode: 'insensitive' } },
            ],
          },
          take: input.limit,
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            facilityType: true,
            complianceScore: true,
          },
          orderBy: [
            { complianceScore: 'desc' },
            { name: 'asc' },
          ],
        });

        return facilities.map((f) => ({
          ...f,
          complianceScore: f.complianceScore?.toNumber() ?? null,
        }));
      }
    }),

  // Full-text search (will integrate with Meilisearch later)
  fullSearch: publicProcedure
    .input(z.object({
      query: z.string(),
      filters: z.object({
        facilityType: z.array(z.string()).optional(),
        city: z.array(z.string()).optional(),
        riskLevel: z.array(z.string()).optional(),
        minScore: z.number().optional(),
        maxScore: z.number().optional(),
      }).optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      // Build where clause
      const where: Record<string, unknown> = {};

      if (input.query) {
        where.OR = [
          { name: { contains: input.query, mode: 'insensitive' } },
          { city: { contains: input.query, mode: 'insensitive' } },
          { county: { contains: input.query, mode: 'insensitive' } },
          { licenseNumber: { contains: input.query, mode: 'insensitive' } },
        ];
      }

      if (input.filters) {
        if (input.filters.facilityType?.length) {
          where.facilityType = { in: input.filters.facilityType };
        }
        if (input.filters.city?.length) {
          where.city = { in: input.filters.city };
        }
        if (input.filters.riskLevel?.length) {
          where.riskLevel = { in: input.filters.riskLevel };
        }
        if (input.filters.minScore !== undefined || input.filters.maxScore !== undefined) {
          where.complianceScore = {
            ...(input.filters.minScore !== undefined && { gte: input.filters.minScore }),
            ...(input.filters.maxScore !== undefined && { lte: input.filters.maxScore }),
          };
        }
      }

      const [facilities, total] = await Promise.all([
        ctx.prisma.facility.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { complianceScore: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            county: true,
            facilityType: true,
            licenseStatus: true,
            capacity: true,
            complianceScore: true,
            riskLevel: true,
            lastInspectionDate: true,
            _count: {
              select: { violations: true },
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
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
        query: input.query,
      };
    }),
});
