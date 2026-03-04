import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { azDHSScraper } from '../scrapers/az-dhs.scraper';

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Job types
interface ScraperJobData {
  scraperName: 'az-dhs';
  options?: {
    fullRefresh?: boolean;
  };
}

interface ScraperJobResult {
  success: boolean;
  facilitiesFound: number;
  facilitiesNew: number;
  facilitiesUpdated: number;
  violationsFound: number;
  errors: string[];
}

// Create queue
export const scraperQueue = new Queue<ScraperJobData, ScraperJobResult>('scraper', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute initial delay
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 50, // Keep last 50 failed jobs
    },
  },
});

// Create worker
export const scraperWorker = new Worker<ScraperJobData, ScraperJobResult>(
  'scraper',
  async (job: Job<ScraperJobData, ScraperJobResult>) => {
    console.log(`Processing scraper job ${job.id}: ${job.data.scraperName}`);

    try {
      switch (job.data.scraperName) {
        case 'az-dhs':
          const result = await azDHSScraper.run();
          return result;

        default:
          throw new Error(`Unknown scraper: ${job.data.scraperName}`);
      }
    } catch (error) {
      console.error(`Scraper job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Only one scraper at a time
  }
);

// Event handlers
scraperWorker.on('completed', (job, result) => {
  console.log(`Scraper job ${job.id} completed:`, result);
});

scraperWorker.on('failed', (job, err) => {
  console.error(`Scraper job ${job?.id} failed:`, err);
});

// Schedule jobs
export async function scheduleScraperJobs(): Promise<void> {
  // Schedule daily AZ DHS scraper
  await scraperQueue.add(
    'az-dhs-daily',
    { scraperName: 'az-dhs' },
    {
      repeat: {
        pattern: '0 2 * * *', // Run at 2 AM every day
      },
    }
  );

  console.log('Scraper jobs scheduled');
}

// Manual trigger
export async function triggerScraper(
  scraperName: 'az-dhs',
  options?: { fullRefresh?: boolean }
): Promise<Job<ScraperJobData, ScraperJobResult>> {
  return scraperQueue.add(
    `${scraperName}-manual`,
    { scraperName, options },
    { priority: 1 }
  );
}
