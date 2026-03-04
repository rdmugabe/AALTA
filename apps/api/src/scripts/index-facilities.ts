#!/usr/bin/env npx tsx
/**
 * Index all facilities to Meilisearch
 * Run with: npx tsx src/scripts/index-facilities.ts
 */

import { searchService } from '../services/search.service';

async function main() {
  console.log('='.repeat(60));
  console.log('AALTA - Facility Search Indexing');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Initialize index
    console.log('Initializing search index...');
    await searchService.initialize();
    console.log('Index initialized');

    // Index all facilities
    console.log('');
    console.log('Indexing facilities...');
    const result = await searchService.indexAllFacilities();

    console.log('');
    console.log('='.repeat(60));
    console.log('INDEXING RESULTS');
    console.log('='.repeat(60));
    console.log(`Indexed: ${result.indexed}`);
    console.log(`Errors: ${result.errors}`);

    // Get stats
    const stats = await searchService.getStats();
    console.log('');
    console.log('Index Stats:');
    console.log(`  Documents: ${stats.numberOfDocuments}`);
    console.log(`  Is Indexing: ${stats.isIndexing}`);

    console.log('='.repeat(60));
    console.log(`Completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('INDEXING FAILED');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
