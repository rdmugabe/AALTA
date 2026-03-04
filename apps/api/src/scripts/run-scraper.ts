#!/usr/bin/env npx tsx
/**
 * Manual scraper execution script
 * Run with: npx tsx src/scripts/run-scraper.ts
 */

import { azDHSScraper } from '../scrapers/az-dhs.scraper';

async function main() {
  console.log('='.repeat(60));
  console.log('AALTA - Arizona DHS Facility Scraper');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  try {
    const result = await azDHSScraper.run();

    console.log('');
    console.log('='.repeat(60));
    console.log('SCRAPER RESULTS');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Duration: ${(result.duration / 1000).toFixed(1)} seconds`);
    console.log(`Facilities Found: ${result.facilitiesFound}`);
    console.log(`  - New: ${result.facilitiesNew}`);
    console.log(`  - Updated: ${result.facilitiesUpdated}`);
    console.log(`Violations Found: ${result.violationsFound}`);
    console.log(`  - New: ${result.violationsNew}`);
    console.log(`Inspections Found: ${result.inspectionsFound}`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('Errors:');
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    console.log('='.repeat(60));
    console.log(`Completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('SCRAPER FAILED');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
