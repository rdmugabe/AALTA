import puppeteer from 'puppeteer';

const CONFIG = {
  sodSearch: {
    baseUrl: 'https://hsapps.azdhs.gov/ls/sod/',
    providerSearchUrl: 'https://hsapps.azdhs.gov/ls/sod/Provider.aspx',
  },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

async function testScraper() {
  console.log('Starting simple scraper test...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(CONFIG.userAgent);
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Step 1: Go to search page
    console.log('1. Loading search page for letter "a"...');
    await page.goto(
      `${CONFIG.sodSearch.providerSearchUrl}?ProviderName=a`,
      { waitUntil: 'networkidle2', timeout: 60000 }
    );

    // Step 2: Get facility list
    console.log('2. Extracting facility list...');
    const facilities = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tr'));
      const results: Array<{ name: string; address: string; city: string; type: string }> = [];

      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const selectLink = cells[0]?.querySelector('a');
          if (selectLink && selectLink.textContent?.toLowerCase().includes('select')) {
            results.push({
              name: cells[1]?.textContent?.trim() || '',
              address: cells[2]?.textContent?.trim() || '',
              city: cells[3]?.textContent?.trim() || '',
              type: cells[4]?.textContent?.trim() || '',
            });
          }
        }
      }
      return results;
    });

    console.log(`   Found ${facilities.length} facilities on page 1`);
    if (facilities.length > 0) {
      console.log(`   First: ${facilities[0].name}`);
    }

    // Step 3: Click first Select link
    console.log('3. Clicking first facility...');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        if (link.textContent?.toLowerCase().includes('select')) {
          link.click();
          return;
        }
      }
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    console.log(`   Navigated to: ${page.url()}`);

    // Step 4: Wait for Salesforce content
    console.log('4. Waiting for Salesforce content...');
    await new Promise(r => setTimeout(r, 5000));

    // Step 5: Extract Details tab data
    console.log('5. Extracting Details tab...');
    let html = await page.content();

    const extractValue = (label: string): string => {
      const pattern = new RegExp(
        `<p[^>]*>${label}</p>\\s*(?:<a[^>]*>)?\\s*<lightning-formatted-(?:text|phone)[^>]*>(?:<a[^>]*>)?([^<]+)`,
        'i'
      );
      const match = html.match(pattern);
      return match ? match[1].trim() : '';
    };

    const details = {
      legalName: extractValue('Legal Name'),
      address: extractValue('Address'),
      phone: extractValue('Phone'),
      license: extractValue('License'),
      licenseStatus: extractValue('License Status'),
      facilityStatus: extractValue('Facility Status'),
      facilityType: extractValue('Facility Type'),
      owner: extractValue('Owner / Licensee'),
      administrator: extractValue('Chief Administrative Officer'),
      licenseEffective: extractValue('License Effective'),
    };

    console.log('   Details:');
    Object.entries(details).forEach(([k, v]) => {
      if (v) console.log(`     ${k}: ${v}`);
    });

    // Extract services
    const services: string[] = [];
    const serviceMatches = html.match(/<span class="service-type[^"]*">([^<]+)<\/span>/g);
    if (serviceMatches) {
      serviceMatches.forEach(m => {
        const text = m.match(/>([^<]+)</)?.[1];
        if (text) services.push(text);
      });
    }
    if (services.length > 0) {
      console.log(`   Services: ${services.join(', ')}`);
    }

    // Step 6: Click Inspections tab
    console.log('6. Clicking Inspections tab...');
    try {
      await page.click('#Inspections__item');
      await new Promise(r => setTimeout(r, 2000));
      html = await page.content();

      // Extract inspection data
      const inspectionMatches = html.match(/<tr[^>]*data-row-key-value="row-\d+"[^>]*>.*?<\/tr>/gs);
      if (inspectionMatches) {
        console.log(`   Found ${inspectionMatches.length} inspections`);
        inspectionMatches.slice(0, 3).forEach((row, i) => {
          const dateMatch = row.match(/data-col-key-value="inspectionDates[^"]*"[^>]*data-cell-value="([^"]+)"/);
          const typeMatch = row.match(/data-col-key-value="inspectionType[^"]*"[^>]*data-cell-value="([^"]+)"/);
          const statusMatch = row.match(/data-col-key-value="inspectionStatus[^"]*"[^>]*data-cell-value="([^"]+)"/);
          console.log(`     ${i + 1}. Date: ${dateMatch?.[1] || 'N/A'}, Type: ${typeMatch?.[1] || 'N/A'}, Status: ${statusMatch?.[1] || 'N/A'}`);
        });
      } else {
        console.log('   No inspections found');
      }
    } catch (e) {
      console.log('   Could not click Inspections tab');
    }

    // Step 7: Click Enforcements tab
    console.log('7. Clicking Enforcements tab...');
    try {
      await page.click('#enforcements__item');
      await new Promise(r => setTimeout(r, 2000));
      html = await page.content();

      const enforcementMatches = html.match(/<tr[^>]*data-row-key-value="row-\d+"[^>]*>.*?<\/tr>/gs);
      if (enforcementMatches) {
        console.log(`   Found ${enforcementMatches.length} enforcements`);
      } else {
        // Check for "no records" message
        if (html.includes('No enforcement') || html.includes('no record')) {
          console.log('   No enforcements on record');
        } else {
          console.log('   No enforcements found');
        }
      }
    } catch (e) {
      console.log('   Could not click Enforcements tab');
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testScraper().catch(console.error);
