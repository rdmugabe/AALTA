import { ArizonaDHSScraper } from '../scrapers/az-dhs.scraper';

async function testScraper() {
  console.log('Starting scraper test...');

  const scraper = new ArizonaDHSScraper();

  try {
    // Run the scraper
    const result = await scraper.run({ fullRefresh: false });

    console.log('\n=== RESULTS ===');
    console.log('Status:', result.status);
    console.log('Facilities scraped:', result.facilitiesScraped);
    console.log('Violations found:', result.violationsFound);
    console.log('Inspections found:', result.inspectionsFound);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.slice(0, 5).forEach(e => console.log('  -', e));
    }

    // Print first facility details
    if (result.facilities && result.facilities.length > 0) {
      console.log('\n=== First Facility ===');
      const f = result.facilities[0];
      console.log('Name:', f.name);
      console.log('License:', f.licenseNumber);
      console.log('Address:', f.address);
      console.log('City:', f.city);
      console.log('Status:', f.licenseStatus);
      console.log('Type:', f.facilityType);
      console.log('Services:', f.specializations?.join(', ') || 'none');
    }

    // Print inspections
    if (result.inspections && result.inspections.length > 0) {
      console.log('\n=== Inspections ===');
      result.inspections.slice(0, 5).forEach(i => {
        console.log(`  - ${i.inspectionType} on ${i.inspectionDate?.toISOString?.() || i.inspectionDate}`);
      });
    }

    console.log('\n=== Test complete ===');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testScraper().catch(console.error);
