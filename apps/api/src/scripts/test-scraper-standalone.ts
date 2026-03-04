#!/usr/bin/env npx tsx
/**
 * Standalone scraper test - tests scraping without database
 * Run with: PUPPETEER_CACHE_DIR=/tmp/puppeteer-cache npx tsx src/scripts/test-scraper-standalone.ts
 */

import puppeteer from 'puppeteer';

const CONFIG = {
  azCareCheck: {
    baseUrl: 'https://azcarecheck.azdhs.gov/s/',
    searchUrl: 'https://azcarecheck.azdhs.gov/s/facility-search',
  },
  sodSearch: {
    providerSearchUrl: 'https://hsapps.azdhs.gov/ls/sod/Provider.aspx',
  },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  timeout: 60000,
};

async function testScraping() {
  console.log('='.repeat(60));
  console.log('AALTA - Scraper Standalone Test');
  console.log('='.repeat(60));
  console.log('');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(CONFIG.userAgent);
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Test 1: SOD Provider Search
    console.log('Test 1: SOD Provider Search');
    console.log('-'.repeat(40));

    const searchUrl = `${CONFIG.sodSearch.providerSearchUrl}?ProviderName=sunrise`;
    console.log(`Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout,
    });

    // Take screenshot
    await page.screenshot({ path: '/tmp/sod-search-results.png', fullPage: true });
    console.log('Screenshot saved: /tmp/sod-search-results.png');

    // Extract facilities - columns: Select | Name | Address | City/State | Type
    const sodFacilities = await page.evaluate(() => {
      const facilities: Array<{ name: string; address: string; cityState: string; type: string }> = [];
      const rows = document.querySelectorAll('#ctl00_ContentPlaceHolder1_DgFacils tr');

      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          facilities.push({
            name: cells[1]?.textContent?.trim() || '',
            address: cells[2]?.textContent?.trim() || '',
            cityState: cells[3]?.textContent?.trim() || '',
            type: cells[4]?.textContent?.trim() || '',
          });
        }
      });

      return facilities;
    });

    console.log(`Found ${sodFacilities.length} facilities from SOD search`);

    // Filter for assisted living
    const assistedLivingFacilities = sodFacilities.filter(f => {
      const typeLower = f.type.toLowerCase();
      return typeLower.includes('assisted living') ||
             typeLower.includes('nursing') ||
             typeLower.includes('group home') ||
             typeLower.includes('hospice');
    });

    console.log(`  ${assistedLivingFacilities.length} are assisted living related`);

    if (assistedLivingFacilities.length > 0) {
      console.log('Sample assisted living facilities:');
      assistedLivingFacilities.slice(0, 5).forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name}`);
        console.log(`     Address: ${f.address}`);
        console.log(`     Location: ${f.cityState}`);
        console.log(`     Type: ${f.type}`);
      });
    }

    console.log('');
    console.log('Test 2: AZ Care Check');
    console.log('-'.repeat(40));

    console.log(`Navigating to: ${CONFIG.azCareCheck.baseUrl}`);

    await page.goto(CONFIG.azCareCheck.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout,
    });

    // Wait for Salesforce to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Take screenshot
    await page.screenshot({ path: '/tmp/azcarecheck-home.png', fullPage: true });
    console.log('Screenshot saved: /tmp/azcarecheck-home.png');

    // Check page content
    const pageContent = await page.content();
    const hasSearch = pageContent.toLowerCase().includes('search');
    const hasFacility = pageContent.toLowerCase().includes('facility');

    console.log(`Page loaded - hasSearch: ${hasSearch}, hasFacility: ${hasFacility}`);

    // Try to find links
    const links = await page.evaluate(() => {
      const allLinks: string[] = [];
      document.querySelectorAll('a').forEach(a => {
        const href = a.href;
        if (href && (href.includes('facility') || href.includes('provider'))) {
          allLinks.push(href);
        }
      });
      return allLinks.slice(0, 10);
    });

    console.log(`Found ${links.length} relevant links`);
    links.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link}`);
    });

    console.log('');
    console.log('='.repeat(60));
    console.log('SCRAPER TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

    // Summary
    console.log('');
    console.log('Summary:');
    console.log(`  - SOD Search: ${sodFacilities.length > 0 ? 'WORKING' : 'NO DATA'} (${sodFacilities.length} facilities)`);
    console.log(`  - AZ Care Check: ${hasSearch || hasFacility ? 'PAGE LOADS' : 'ISSUE'}`);
    console.log('');
    console.log('Screenshots saved to /tmp/');

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: '/tmp/scraper-error.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

testScraping().catch(console.error);
