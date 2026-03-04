import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { azDHSScraper } from '../scrapers/az-dhs.scraper';
import { prisma } from '../db/client';
import { triggerScraper } from '../jobs/scraper.job';
import { searchService } from '../services/search.service';

export const adminRouter = router({
  // Trigger scraper manually
  triggerScraper: publicProcedure
    .input(
      z.object({
        scraperName: z.enum(['az-dhs']).default('az-dhs'),
        fullRefresh: z.boolean().default(false),
        async: z.boolean().default(true), // Run via job queue by default
      })
    )
    .mutation(async ({ input }) => {
      if (input.async) {
        // Run via job queue (non-blocking)
        const job = await triggerScraper(input.scraperName, input.fullRefresh);
        return {
          message: 'Scraper job queued',
          jobId: job.id,
          status: 'queued',
        };
      } else {
        // Run directly (blocking) - useful for testing
        const result = await azDHSScraper.run({ fullRefresh: input.fullRefresh });
        return {
          message: 'Scraper completed',
          status: 'completed',
          result,
        };
      }
    }),

  // Get scraper run history
  getScraperRuns: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const [runs, total] = await Promise.all([
        prisma.scraperRun.findMany({
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        prisma.scraperRun.count(),
      ]);

      return {
        runs,
        total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // Get latest scraper run
  getLatestScraperRun: publicProcedure
    .input(
      z.object({
        scraperName: z.string().default('az-dhs'),
      })
    )
    .query(async ({ input }) => {
      const run = await prisma.scraperRun.findFirst({
        where: { scraperName: input.scraperName },
        orderBy: { createdAt: 'desc' },
      });

      return run;
    }),

  // Get database stats
  getDatabaseStats: publicProcedure.query(async () => {
    const [
      facilitiesCount,
      violationsCount,
      inspectionsCount,
      complaintsCount,
      scraperRunsCount,
    ] = await Promise.all([
      prisma.facility.count(),
      prisma.violation.count(),
      prisma.inspection.count(),
      prisma.complaint.count(),
      prisma.scraperRun.count(),
    ]);

    const facilitiesByType = await prisma.facility.groupBy({
      by: ['facilityType'],
      _count: true,
    });

    const facilitiesByStatus = await prisma.facility.groupBy({
      by: ['licenseStatus'],
      _count: true,
    });

    const facilitiesByRiskLevel = await prisma.facility.groupBy({
      by: ['riskLevel'],
      _count: true,
    });

    const recentScraperRuns = await prisma.scraperRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      counts: {
        facilities: facilitiesCount,
        violations: violationsCount,
        inspections: inspectionsCount,
        complaints: complaintsCount,
        scraperRuns: scraperRunsCount,
      },
      facilitiesByType: facilitiesByType.map((g) => ({
        type: g.facilityType,
        count: g._count,
      })),
      facilitiesByStatus: facilitiesByStatus.map((g) => ({
        status: g.licenseStatus,
        count: g._count,
      })),
      facilitiesByRiskLevel: facilitiesByRiskLevel
        .filter((g) => g.riskLevel !== null)
        .map((g) => ({
          riskLevel: g.riskLevel,
          count: g._count,
        })),
      recentScraperRuns,
    };
  }),

  // Recalculate compliance scores for all facilities
  recalculateScores: publicProcedure
    .input(
      z.object({
        facilityId: z.string().optional(), // If not provided, recalculate all
      })
    )
    .mutation(async ({ input }) => {
      // Import scoring function
      const { calculateComplianceScore } = await import('@aalta/scoring');

      if (input.facilityId) {
        // Recalculate single facility
        const facility = await prisma.facility.findUnique({
          where: { id: input.facilityId },
          include: {
            violations: true,
            complaints: true,
            inspections: true,
            ownership: true,
          },
        });

        if (!facility) {
          throw new Error('Facility not found');
        }

        const scoreInput = {
          facility: {
            id: facility.id,
            licenseStatus: facility.licenseStatus,
            lastInspectionDate: facility.lastInspectionDate || undefined,
          },
          violations: facility.violations.map((v) => ({
            severity: v.severity,
            citationDate: v.citationDate,
            status: v.status,
            correctionDate: v.correctionDate || undefined,
            isRepeat: v.isRepeat,
          })),
          complaints: facility.complaints.map((c) => ({
            receivedDate: c.receivedDate,
            substantiated: c.substantiated,
          })),
          inspections: facility.inspections.map((i) => ({
            inspectionDate: i.inspectionDate,
          })),
          ownershipHistory: facility.ownership.map((o) => ({
            effectiveDate: o.effectiveDate,
            isCurrent: o.isCurrent,
          })),
        };

        const result = calculateComplianceScore(scoreInput);

        await prisma.facility.update({
          where: { id: facility.id },
          data: {
            complianceScore: result.complianceScore,
            riskLevel: result.riskLevel,
            scoreUpdatedAt: new Date(),
          },
        });

        return {
          facilityId: facility.id,
          newScore: result.complianceScore,
          riskLevel: result.riskLevel,
        };
      } else {
        // Recalculate all facilities
        const facilities = await prisma.facility.findMany({
          include: {
            violations: true,
            complaints: true,
            inspections: true,
            ownership: true,
          },
        });

        let updated = 0;
        for (const facility of facilities) {
          try {
            const scoreInput = {
              facility: {
                id: facility.id,
                licenseStatus: facility.licenseStatus,
                lastInspectionDate: facility.lastInspectionDate || undefined,
              },
              violations: facility.violations.map((v) => ({
                severity: v.severity,
                citationDate: v.citationDate,
                status: v.status,
                correctionDate: v.correctionDate || undefined,
                isRepeat: v.isRepeat,
              })),
              complaints: facility.complaints.map((c) => ({
                receivedDate: c.receivedDate,
                substantiated: c.substantiated,
              })),
              inspections: facility.inspections.map((i) => ({
                inspectionDate: i.inspectionDate,
              })),
              ownershipHistory: facility.ownership.map((o) => ({
                effectiveDate: o.effectiveDate,
                isCurrent: o.isCurrent,
              })),
            };

            const result = calculateComplianceScore(scoreInput);

            await prisma.facility.update({
              where: { id: facility.id },
              data: {
                complianceScore: result.complianceScore,
                riskLevel: result.riskLevel,
                scoreUpdatedAt: new Date(),
              },
            });

            updated++;
          } catch (error) {
            console.error(`Error updating score for facility ${facility.id}:`, error);
          }
        }

        return {
          message: `Updated scores for ${updated} facilities`,
          updated,
          total: facilities.length,
        };
      }
    }),

  // Initialize search index
  initializeSearchIndex: publicProcedure.mutation(async () => {
    await searchService.initialize();
    return { message: 'Search index initialized' };
  }),

  // Index all facilities
  indexAllFacilities: publicProcedure.mutation(async () => {
    const result = await searchService.indexAllFacilities();
    return {
      message: `Indexed ${result.indexed} facilities`,
      indexed: result.indexed,
      errors: result.errors,
    };
  }),

  // Get search index stats
  getSearchStats: publicProcedure.query(async () => {
    const stats = await searchService.getStats();
    return stats;
  }),

  // Clear search index
  clearSearchIndex: publicProcedure.mutation(async () => {
    await searchService.clearIndex();
    return { message: 'Search index cleared' };
  }),
});
