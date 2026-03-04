import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../db/client';
import { calculateComplianceScore, ALGORITHM_VERSION } from '@aalta/scoring';

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Job types
interface ScoringJobData {
  facilityId?: string;
  recalculateAll?: boolean;
}

interface ScoringJobResult {
  facilitiesProcessed: number;
  errors: string[];
}

// Create queue
export const scoringQueue = new Queue<ScoringJobData, ScoringJobResult>('scoring', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
});

// Create worker
export const scoringWorker = new Worker<ScoringJobData, ScoringJobResult>(
  'scoring',
  async (job: Job<ScoringJobData, ScoringJobResult>) => {
    console.log(`Processing scoring job ${job.id}`);

    const errors: string[] = [];
    let facilitiesProcessed = 0;

    try {
      // Get facilities to process
      let facilities;

      if (job.data.facilityId) {
        // Score single facility
        const facility = await prisma.facility.findUnique({
          where: { id: job.data.facilityId },
        });
        facilities = facility ? [facility] : [];
      } else {
        // Score all facilities
        facilities = await prisma.facility.findMany();
      }

      console.log(`Scoring ${facilities.length} facilities`);

      for (const facility of facilities) {
        try {
          // Get related data
          const [violations, complaints, inspections, ownership] = await Promise.all([
            prisma.violation.findMany({
              where: { facilityId: facility.id },
            }),
            prisma.complaint.findMany({
              where: { facilityId: facility.id },
            }),
            prisma.inspection.findMany({
              where: { facilityId: facility.id },
            }),
            prisma.ownership.findMany({
              where: { facilityId: facility.id },
            }),
          ]);

          // Prepare scoring input
          const scoringInput = {
            facility: {
              ...facility,
              complianceScore: facility.complianceScore?.toNumber() ?? null,
              latitude: facility.latitude?.toNumber() ?? null,
              longitude: facility.longitude?.toNumber() ?? null,
            } as never,
            violations: violations.map((v) => ({
              ...v,
              severityScore: v.severityScore.toNumber(),
              weightedScore: v.weightedScore?.toNumber() ?? null,
            })) as never[],
            complaints: complaints as never[],
            inspections: inspections as never[],
            ownershipHistory: ownership.map((o) => ({
              ...o,
              ownershipPct: o.ownershipPct?.toNumber() ?? null,
            })) as never[],
          };

          // Calculate score
          const result = calculateComplianceScore(scoringInput);

          // Update facility
          await prisma.facility.update({
            where: { id: facility.id },
            data: {
              complianceScore: result.complianceScore,
              riskLevel: result.riskLevel,
              scoreUpdatedAt: new Date(),
            },
          });

          // Create scoring history record
          await prisma.scoringHistory.create({
            data: {
              facilityId: facility.id,
              complianceScore: result.complianceScore,
              violationScore: result.factors.violationScore,
              complaintScore: result.factors.complaintRatio,
              improvementScore: result.factors.improvementScore,
              riskLevel: result.riskLevel,
              activeViolations: violations.filter(
                (v) => v.status === 'CITED' || v.status === 'UNDER_CORRECTION'
              ).length,
              repeatedViolations: violations.filter((v) => v.isRepeat).length,
              recentComplaints: complaints.filter((c) => {
                const receivedDate = new Date(c.receivedDate);
                const monthsAgo = new Date();
                monthsAgo.setMonth(monthsAgo.getMonth() - 12);
                return receivedDate > monthsAgo;
              }).length,
              ownershipChanges: ownership.filter((o) => !o.isCurrent).length,
              algorithmVersion: ALGORITHM_VERSION,
            },
          });

          // Create audit log
          await prisma.auditLog.create({
            data: {
              entityType: 'Facility',
              entityId: facility.id,
              action: 'SCORE_CALCULATION',
              newData: {
                complianceScore: result.complianceScore,
                riskLevel: result.riskLevel,
                algorithmVersion: ALGORITHM_VERSION,
              },
              performedBy: 'SYSTEM',
            },
          });

          facilitiesProcessed++;

          // Progress update
          await job.updateProgress(
            Math.round((facilitiesProcessed / facilities.length) * 100)
          );
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error scoring facility ${facility.id}: ${errorMsg}`);
          console.error(`Error scoring facility ${facility.id}:`, error);
        }
      }

      return {
        facilitiesProcessed,
        errors,
      };
    } catch (error) {
      console.error(`Scoring job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1,
  }
);

// Event handlers
scoringWorker.on('completed', (job, result) => {
  console.log(`Scoring job ${job.id} completed:`, result);
});

scoringWorker.on('failed', (job, err) => {
  console.error(`Scoring job ${job?.id} failed:`, err);
});

// Schedule jobs
export async function scheduleScoringJobs(): Promise<void> {
  // Schedule daily scoring recalculation
  await scoringQueue.add(
    'daily-scoring',
    { recalculateAll: true },
    {
      repeat: {
        pattern: '0 4 * * *', // Run at 4 AM every day (after scraper)
      },
    }
  );

  console.log('Scoring jobs scheduled');
}

// Manual trigger
export async function triggerScoring(
  facilityId?: string
): Promise<Job<ScoringJobData, ScoringJobResult>> {
  return scoringQueue.add(
    facilityId ? `score-facility-${facilityId}` : 'score-all',
    { facilityId, recalculateAll: !facilityId },
    { priority: 1 }
  );
}
