import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
import { prisma } from '../db/client';
import { generateUniqueSlug } from '@aalta/shared';
import type { Prisma, ViolationCategory, ViolationSeverity, ViolationStatus, ScraperStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

// Scraper configuration
const CONFIG = {
  sodSearch: {
    baseUrl: 'https://hsapps.azdhs.gov/ls/sod/',
    providerSearchUrl: 'https://hsapps.azdhs.gov/ls/sod/Provider.aspx',
  },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  rateLimit: {
    delayBetweenRequests: 2000,
    delayAfterSelect: 1500,
    delayAfterTabClick: 1000,
  },
  timeout: 60000,
  maxRetries: 3,
  maxFacilitiesPerRun: 5000,
  downloadDir: '/tmp/aalta-downloads',
};

// Search letters to get comprehensive coverage
const SEARCH_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Facility type filters - only scrape these types
const ASSISTED_LIVING_TYPES = [
  'assisted living',
  'adult care',
  'group home',
  'memory care',
  'nursing',
  'hospice',
  'behavioral health residential',
  'adult foster',
  'adult day',
];

// Types
interface ScrapedFacility {
  licenseNumber: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  facilityType: string;
  licenseStatus: string;
  capacity: number;
  specializations: string[];
  licenseIssueDate?: Date;
  licenseExpiryDate?: Date;
  lastInspectionDate?: Date;
  sourceUrl: string;
  phone?: string;
  administrator?: string;
  owner?: string;
}

interface ScrapedViolation {
  facilityLicenseNumber: string;
  violationCode: string;
  category: string;
  description: string;
  severity: string;
  citationDate: Date;
  correctionDueDate?: Date;
  correctionDate?: Date;
  status: string;
  regulationCitation?: string;
  inspectionType?: string;
  surveyDate?: Date;
  source?: string;
}

interface ScrapedInspection {
  facilityLicenseNumber: string;
  inspectionType: string;
  inspectionDate: Date;
  exitDate?: Date;
  overallResult: string;
  violationCount: number;
  reportUrl?: string;
  reportContent?: string;
}

interface ScrapedEnforcement {
  facilityLicenseNumber: string;
  enforcementType: string;
  effectiveDate: Date;
  description: string;
  status: string;
}

interface FacilityDetails {
  facility: ScrapedFacility;
  violations: ScrapedViolation[];
  inspections: ScrapedInspection[];
  enforcements: ScrapedEnforcement[];
}

export interface ScraperResult {
  success: boolean;
  facilitiesFound: number;
  facilitiesNew: number;
  facilitiesUpdated: number;
  violationsFound: number;
  violationsNew: number;
  inspectionsFound: number;
  enforcementsFound: number;
  errors: string[];
  duration: number;
}

export class ArizonaDHSScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private startTime: number = 0;
  private processedFacilities: Set<string> = new Set();
  private downloadedPDFs: Map<string, string> = new Map();

  async initialize(): Promise<void> {
    console.log('Initializing browser...');

    // Create download directory
    if (!fs.existsSync(CONFIG.downloadDir)) {
      fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
    }

    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(CONFIG.userAgent);
    await this.page.setViewport({ width: 1920, height: 1080 });
    this.page.setDefaultNavigationTimeout(CONFIG.timeout);
    this.page.setDefaultTimeout(CONFIG.timeout);

    // Enable download behavior
    const client = await this.page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: CONFIG.downloadDir,
    });

    console.log('Browser initialized');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private async delay(ms: number = CONFIG.rateLimit.delayBetweenRequests): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isAssistedLivingType(type: string): boolean {
    const typeLower = type.toLowerCase();
    return ASSISTED_LIVING_TYPES.some(t => typeLower.includes(t));
  }

  private parseDate(dateStr: string | undefined | null): Date | undefined {
    if (!dateStr || dateStr === 'N/A' || dateStr === '' || dateStr === 'null') return undefined;

    const cleanDate = dateStr.trim();

    // MM/DD/YYYY format
    const mdyMatch = cleanDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mdyMatch) {
      return new Date(parseInt(mdyMatch[3]), parseInt(mdyMatch[1]) - 1, parseInt(mdyMatch[2]));
    }

    // YYYY-MM-DD format
    const ymdMatch = cleanDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      return new Date(parseInt(ymdMatch[1]), parseInt(ymdMatch[2]) - 1, parseInt(ymdMatch[3]));
    }

    const parsed = Date.parse(cleanDate);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }

    return undefined;
  }

  // Main scraping method for SOD Provider search
  async scrapeFacilitiesFromSOD(): Promise<{
    facilities: ScrapedFacility[];
    violations: ScrapedViolation[];
    inspections: ScrapedInspection[];
    enforcements: ScrapedEnforcement[];
  }> {
    if (!this.page) throw new Error('Scraper not initialized');

    const allFacilities: ScrapedFacility[] = [];
    const allViolations: ScrapedViolation[] = [];
    const allInspections: ScrapedInspection[] = [];
    const allEnforcements: ScrapedEnforcement[] = [];

    for (const letter of SEARCH_LETTERS) {
      if (allFacilities.length >= CONFIG.maxFacilitiesPerRun) {
        console.log(`Reached max facilities limit (${CONFIG.maxFacilitiesPerRun}), stopping`);
        break;
      }

      console.log(`\n========================================`);
      console.log(`Searching for facilities starting with "${letter.toUpperCase()}"`);
      console.log(`========================================`);

      try {
        // Navigate to search with this letter
        await this.page.goto(
          `${CONFIG.sodSearch.providerSearchUrl}?ProviderName=${letter}`,
          { waitUntil: 'networkidle2', timeout: CONFIG.timeout }
        );
        await this.delay(1000);

        // Get total records count
        const paginationInfo = await this.getPaginationInfo();

        if (!paginationInfo || paginationInfo.total === 0) {
          console.log(`  No facilities found for letter "${letter}"`);
          continue;
        }

        console.log(`  Found ${paginationInfo.total} total facilities`);

        const totalPages = Math.ceil(paginationInfo.total / paginationInfo.recordsPerPage);

        // Process all pages for this letter
        for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
          console.log(`\n  --- Page ${currentPage}/${totalPages} ---`);

          // Get facilities on current page
          const facilityList = await this.extractFacilityListFromPage();
          console.log(`  Found ${facilityList.length} facilities on this page`);

          // Process each facility by clicking Select
          for (let i = 0; i < facilityList.length; i++) {
            const basicInfo = facilityList[i];

            // Skip non-assisted-living types
            if (!this.isAssistedLivingType(basicInfo.type)) {
              continue;
            }

            // Skip duplicates
            const facilityKey = `${basicInfo.name}|${basicInfo.address}`.toLowerCase();
            if (this.processedFacilities.has(facilityKey)) {
              continue;
            }
            this.processedFacilities.add(facilityKey);

            console.log(`    [${allFacilities.length + 1}] Processing: ${basicInfo.name}`);

            try {
              // Click Select and extract all details from tabs
              const details = await this.clickSelectAndExtractAllDetails(i, basicInfo);

              if (details) {
                allFacilities.push(details.facility);
                allViolations.push(...details.violations);
                allInspections.push(...details.inspections);
                allEnforcements.push(...details.enforcements);

                console.log(`        -> ${details.violations.length} violations, ${details.inspections.length} inspections, ${details.enforcements.length} enforcements`);
              }

              // Return to search results
              await this.returnToSearchResults(letter, currentPage);

            } catch (error) {
              console.error(`        Error processing ${basicInfo.name}:`, error);
              // Try to recover
              await this.returnToSearchResults(letter, currentPage);
            }
          }

          // Navigate to next page if available
          if (currentPage < totalPages) {
            const navigated = await this.navigateToNextPage();
            if (!navigated) {
              console.log(`  Could not navigate to next page, moving to next letter`);
              break;
            }
          }
        }

        await this.delay();

      } catch (error) {
        console.error(`Error processing letter "${letter}":`, error);
      }
    }

    return {
      facilities: allFacilities,
      violations: allViolations,
      inspections: allInspections,
      enforcements: allEnforcements,
    };
  }

  private async getPaginationInfo(): Promise<{
    start: number;
    end: number;
    total: number;
    recordsPerPage: number;
  } | null> {
    if (!this.page) return null;

    return await this.page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/Records\s+(\d+)\s+Through\s+(\d+)\s+of\s+(\d+)/i);
      if (match) {
        const start = parseInt(match[1]);
        const end = parseInt(match[2]);
        const total = parseInt(match[3]);
        return {
          start,
          end,
          total,
          recordsPerPage: end - start + 1,
        };
      }
      return null;
    });
  }

  private async extractFacilityListFromPage(): Promise<Array<{
    name: string;
    address: string;
    cityState: string;
    type: string;
    index: number;
  }>> {
    if (!this.page) return [];

    return await this.page.evaluate(() => {
      const facilities: Array<{
        name: string;
        address: string;
        cityState: string;
        type: string;
        index: number;
      }> = [];

      // Find all table rows with data
      const rows = document.querySelectorAll('table tr');
      let dataIndex = 0;

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        // Data rows have 5 cells: Select button, Name, Address, City/State, Type
        if (cells.length >= 5) {
          const selectCell = cells[0];
          const hasSelectButton = selectCell?.querySelector('input[type="image"], input[type="submit"], a[href*="Select"]');

          if (hasSelectButton) {
            facilities.push({
              name: cells[1]?.textContent?.trim() || '',
              address: cells[2]?.textContent?.trim() || '',
              cityState: cells[3]?.textContent?.trim() || '',
              type: cells[4]?.textContent?.trim() || '',
              index: dataIndex,
            });
            dataIndex++;
          }
        }
      });

      return facilities;
    });
  }

  private async clickSelectAndExtractAllDetails(
    rowIndex: number,
    basicInfo: { name: string; address: string; cityState: string; type: string }
  ): Promise<FacilityDetails | null> {
    if (!this.page) return null;

    try {
      // Find and click Select button by facility name
      const clicked = await this.page.evaluate((facilityName: string) => {
        // Find the row containing this facility
        const rows = Array.from(document.querySelectorAll('table tr'));

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length < 2) continue;

          // Check if any cell contains the facility name (first 25 chars to handle variations)
          const nameToMatch = facilityName.substring(0, 25).toUpperCase();
          let foundInRow = false;

          for (let i = 1; i < cells.length; i++) {
            const cellText = (cells[i]?.textContent || '').toUpperCase().trim();
            if (cellText.includes(nameToMatch) || nameToMatch.includes(cellText.substring(0, 20))) {
              foundInRow = true;
              break;
            }
          }

          if (foundInRow) {
            // Find clickable element in first cell
            const firstCell = cells[0];
            const clickable = firstCell?.querySelector('input, a, button') as HTMLElement;
            if (clickable) {
              clickable.click();
              return true;
            }
          }
        }
        return false;
      }, basicInfo.name);

      if (!clicked) {
        console.log(`        Could not click Select for: ${basicInfo.name.substring(0, 30)}`);
        return null;
      }

      // Wait for navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await this.delay(CONFIG.rateLimit.delayAfterSelect);

      // Extract data from all three tabs
      const details = await this.extractFromAllTabs(basicInfo);

      return details;

    } catch (error) {
      console.error('Error in clickSelectAndExtractAllDetails:', error);
      return null;
    }
  }

  private async extractFromAllTabs(basicInfo: { name: string; address: string; cityState: string; type: string }): Promise<FacilityDetails | null> {
    if (!this.page) return null;

    // Initialize with basic info
    let facility: ScrapedFacility = {
      licenseNumber: '',
      name: basicInfo.name,
      address: basicInfo.address,
      city: this.parseCityFromCityState(basicInfo.cityState),
      state: 'AZ',
      zipCode: this.parseZipFromCityState(basicInfo.cityState),
      county: '',
      facilityType: basicInfo.type,
      licenseStatus: 'ACTIVE',
      capacity: 0,
      specializations: [],
      sourceUrl: this.page.url(),
    };

    const violations: ScrapedViolation[] = [];
    const inspections: ScrapedInspection[] = [];
    const enforcements: ScrapedEnforcement[] = [];

    try {
      // Look for tabs on the page
      const tabs = await this.findTabs();
      console.log(`        Found ${tabs.length} tabs: ${tabs.map(t => t.name).join(', ')}`);

      // Process each tab
      for (const tab of tabs) {
        console.log(`        Processing tab: ${tab.name}`);

        try {
          // Click the tab
          await this.clickTab(tab);
          await this.delay(CONFIG.rateLimit.delayAfterTabClick);

          // Extract data based on tab type
          if (tab.name.toLowerCase().includes('detail')) {
            const detailData = await this.extractDetailsTab();
            if (detailData) {
              facility = { ...facility, ...detailData };
            }
          } else if (tab.name.toLowerCase().includes('inspection')) {
            const inspectionData = await this.extractInspectionsTab(facility.licenseNumber || `TEMP-${basicInfo.name}`);
            inspections.push(...inspectionData);
          } else if (tab.name.toLowerCase().includes('enforcement')) {
            const enforcementData = await this.extractEnforcementsTab(facility.licenseNumber || `TEMP-${basicInfo.name}`);
            enforcements.push(...enforcementData.enforcements);
            violations.push(...enforcementData.violations);
          }
        } catch (tabError) {
          console.error(`        Error processing tab ${tab.name}:`, tabError);
        }
      }

      // If no tabs found, try to extract from current page
      if (tabs.length === 0) {
        console.log(`        No tabs found, extracting from current page`);
        const pageData = await this.extractFromCurrentPage(facility.licenseNumber || `TEMP-${basicInfo.name}`);
        if (pageData.facility) {
          facility = { ...facility, ...pageData.facility };
        }
        violations.push(...pageData.violations);
        inspections.push(...pageData.inspections);
      }

      // Generate license number if not found
      if (!facility.licenseNumber) {
        facility.licenseNumber = `TEMP-${Buffer.from(`${basicInfo.name}-${basicInfo.address}`).toString('base64').slice(0, 12)}`;
      }

      // Update violation license numbers
      violations.forEach(v => {
        v.facilityLicenseNumber = facility.licenseNumber;
      });
      inspections.forEach(i => {
        i.facilityLicenseNumber = facility.licenseNumber;
      });
      enforcements.forEach(e => {
        e.facilityLicenseNumber = facility.licenseNumber;
      });

      return { facility, violations, inspections, enforcements };

    } catch (error) {
      console.error('Error extracting from tabs:', error);
      return null;
    }
  }

  private async findTabs(): Promise<Array<{ name: string; selector: string; element?: ElementHandle }>> {
    if (!this.page) return [];

    // Look for tab elements using various selectors
    const tabSelectors = [
      'a[href*="Tab"]',
      'input[type="submit"][value*="Tab"]',
      '.nav-tabs a',
      '.tab-list a',
      '[role="tab"]',
      'a.tab',
      'button.tab',
      'input[type="button"][value*="Inspection"]',
      'input[type="button"][value*="Enforcement"]',
      'input[type="button"][value*="Detail"]',
      'a:contains("Inspection")',
      'a:contains("Enforcement")',
      'a:contains("Detail")',
    ];

    const tabs: Array<{ name: string; selector: string }> = [];

    // Try to find tabs by looking at page content
    const tabInfo = await this.page.evaluate(() => {
      const foundTabs: Array<{ name: string; selector: string; innerText: string }> = [];

      // Look for elements that look like tabs
      const potentialTabs = document.querySelectorAll('a, input[type="submit"], input[type="button"], button');

      potentialTabs.forEach((el, index) => {
        const text = (el as HTMLElement).innerText?.trim() ||
                    (el as HTMLInputElement).value?.trim() || '';
        const textLower = text.toLowerCase();

        if (textLower.includes('inspection') ||
            textLower.includes('enforcement') ||
            textLower.includes('detail') ||
            textLower.includes('survey')) {
          // Generate a unique selector for this element
          let selector = '';
          if (el.id) {
            selector = `#${el.id}`;
          } else if (el.tagName === 'INPUT') {
            selector = `input[value="${(el as HTMLInputElement).value}"]`;
          } else if (el.tagName === 'A') {
            const href = (el as HTMLAnchorElement).href;
            if (href) {
              selector = `a[href="${href.split(window.location.origin).pop()}"]`;
            }
          }

          if (!selector) {
            // Create xpath-like selector
            selector = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
          }

          foundTabs.push({
            name: text,
            selector,
            innerText: text,
          });
        }
      });

      return foundTabs;
    });

    return tabInfo;
  }

  private async clickTab(tab: { name: string; selector: string }): Promise<void> {
    if (!this.page) return;

    try {
      // Try clicking by the selector
      const element = await this.page.$(tab.selector);
      if (element) {
        await element.click();
        await this.page.waitForNetworkIdle({ timeout: 10000 }).catch(() => {});
        return;
      }

      // Fallback: find by text content
      const clickedByText = await this.page.evaluate((tabName) => {
        const elements = Array.from(document.querySelectorAll('a, input[type="submit"], input[type="button"], button'));
        for (const el of elements) {
          const text = (el as HTMLElement).innerText?.trim() ||
                      (el as HTMLInputElement).value?.trim() || '';
          if (text.toLowerCase().includes(tabName.toLowerCase())) {
            (el as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, tab.name);

      if (clickedByText) {
        await this.page.waitForNetworkIdle({ timeout: 10000 }).catch(() => {});
      }
    } catch (error) {
      console.log(`Could not click tab ${tab.name}:`, error);
    }
  }

  private async extractDetailsTab(): Promise<Partial<ScrapedFacility> | null> {
    if (!this.page) return null;

    const rawData = await this.page.evaluate(() => {
      const getText = (labels: string[]): string => {
        for (const label of labels) {
          // Search in table cells
          const cells = Array.from(document.querySelectorAll('td, th'));
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i]?.textContent?.toLowerCase().trim() || '';
            if (cellText.includes(label.toLowerCase())) {
              // Get next cell or sibling
              const nextCell = cells[i + 1];
              if (nextCell?.textContent?.trim()) {
                return nextCell.textContent.trim();
              }
            }
          }

          // Search in label-value pairs
          const labelElements = Array.from(document.querySelectorAll('label, strong, b, dt, .label'));
          for (const el of labelElements) {
            if (el.textContent?.toLowerCase().includes(label.toLowerCase())) {
              const next = el.nextElementSibling || el.parentElement?.nextElementSibling;
              if (next?.textContent?.trim()) {
                return next.textContent.trim();
              }
            }
          }

          // Regex search in page content
          const pattern = new RegExp(`${label}[:\\s]*([^\\n\\r]+)`, 'i');
          const match = document.body.innerText.match(pattern);
          if (match && match[1]?.trim()) {
            return match[1].trim();
          }
        }
        return '';
      };

      return {
        licenseNumber: getText(['license number', 'license #', 'license no', 'lic #', 'license']),
        name: getText(['facility name', 'provider name', 'name']),
        address: getText(['address', 'street address', 'street']),
        city: getText(['city']),
        zipCode: getText(['zip', 'zip code', 'postal']),
        county: getText(['county']),
        phone: getText(['phone', 'telephone', 'tel']),
        administrator: getText(['administrator', 'manager', 'director']),
        owner: getText(['owner', 'operator', 'proprietor']),
        capacityStr: getText(['capacity', 'beds', 'licensed capacity', 'bed count']),
        licenseStatus: getText(['status', 'license status']),
        facilityType: getText(['type', 'facility type', 'license type', 'category']),
        licenseIssueDateStr: getText(['issue date', 'license issue', 'issued']),
        licenseExpiryDateStr: getText(['expiration', 'expiry', 'expires', 'exp date']),
      };
    });

    return {
      licenseNumber: rawData.licenseNumber,
      name: rawData.name,
      address: rawData.address,
      city: rawData.city,
      zipCode: rawData.zipCode,
      county: rawData.county,
      phone: rawData.phone,
      administrator: rawData.administrator,
      owner: rawData.owner,
      capacity: parseInt(rawData.capacityStr) || 0,
      licenseStatus: rawData.licenseStatus,
      facilityType: rawData.facilityType,
      licenseIssueDate: this.parseDate(rawData.licenseIssueDateStr),
      licenseExpiryDate: this.parseDate(rawData.licenseExpiryDateStr),
    };
  }

  private async extractInspectionsTab(licenseNumber: string): Promise<ScrapedInspection[]> {
    if (!this.page) return [];

    const inspections: ScrapedInspection[] = [];

    try {
      // Extract inspection table data
      const inspectionData = await this.page.evaluate(() => {
        const results: Array<{
          type: string;
          date: string;
          exitDate: string;
          result: string;
          deficiencyCount: string;
          hasAttachment: boolean;
          attachmentSelector?: string;
        }> = [];

        // Find tables that look like inspection tables
        const tables = Array.from(document.querySelectorAll('table'));

        for (const table of tables) {
          const headerRow = table.querySelector('tr');
          if (!headerRow) continue;

          const headers = Array.from(headerRow.querySelectorAll('th, td'))
            .map((cell: Element) => cell.textContent?.toLowerCase().trim() || '');

          // Check if this looks like an inspection table
          const hasInspectionColumns = headers.some(h =>
            h.includes('survey') || h.includes('inspection') || h.includes('type')
          );

          if (!hasInspectionColumns) continue;

          // Find column indices
          const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('survey'));
          const dateIdx = headers.findIndex(h => h.includes('date') && !h.includes('exit'));
          const exitIdx = headers.findIndex(h => h.includes('exit'));
          const resultIdx = headers.findIndex(h => h.includes('result') || h.includes('finding'));
          const countIdx = headers.findIndex(h => h.includes('deficienc') || h.includes('count') || h.includes('citation'));

          // Extract data rows
          const rows = table.querySelectorAll('tr');
          for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length < 2) continue;

            // Check for attachment link
            let hasAttachment = false;
            let attachmentSelector = '';
            const links = rows[i].querySelectorAll('a');
            links.forEach((link, linkIdx) => {
              const href = link.getAttribute('href') || '';
              const text = link.textContent?.toLowerCase() || '';
              if (href.includes('.pdf') || href.includes('attachment') || href.includes('document') ||
                  text.includes('view') || text.includes('report') || text.includes('pdf')) {
                hasAttachment = true;
                attachmentSelector = `table tr:nth-child(${i + 1}) a:nth-child(${linkIdx + 1})`;
              }
            });

            results.push({
              type: typeIdx >= 0 && cells[typeIdx] ? cells[typeIdx].textContent?.trim() || '' : '',
              date: dateIdx >= 0 && cells[dateIdx] ? cells[dateIdx].textContent?.trim() || '' : '',
              exitDate: exitIdx >= 0 && cells[exitIdx] ? cells[exitIdx].textContent?.trim() || '' : '',
              result: resultIdx >= 0 && cells[resultIdx] ? cells[resultIdx].textContent?.trim() || '' : '',
              deficiencyCount: countIdx >= 0 && cells[countIdx] ? cells[countIdx].textContent?.trim() || '' : '0',
              hasAttachment,
              attachmentSelector,
            });
          }
        }

        return results;
      });

      // Convert to ScrapedInspection and download PDFs
      for (const data of inspectionData) {
        const inspection: ScrapedInspection = {
          facilityLicenseNumber: licenseNumber,
          inspectionType: this.mapInspectionType(data.type),
          inspectionDate: this.parseDate(data.date) || new Date(),
          exitDate: this.parseDate(data.exitDate),
          overallResult: data.result || (parseInt(data.deficiencyCount) > 0 ? 'DEFICIENCIES_CITED' : 'NO_DEFICIENCIES'),
          violationCount: parseInt(data.deficiencyCount) || 0,
        };

        // Try to download PDF attachment
        if (data.hasAttachment && data.attachmentSelector) {
          try {
            const pdfContent = await this.downloadAndParsePDF(data.attachmentSelector);
            if (pdfContent) {
              inspection.reportContent = pdfContent;
            }
          } catch (pdfError) {
            console.log(`        Could not download PDF for inspection`);
          }
        }

        inspections.push(inspection);
      }

    } catch (error) {
      console.error('Error extracting inspections:', error);
    }

    return inspections;
  }

  private async extractEnforcementsTab(licenseNumber: string): Promise<{
    enforcements: ScrapedEnforcement[];
    violations: ScrapedViolation[];
  }> {
    if (!this.page) return { enforcements: [], violations: [] };

    const enforcements: ScrapedEnforcement[] = [];
    const violations: ScrapedViolation[] = [];

    try {
      const enforcementData = await this.page.evaluate(() => {
        const results: Array<{
          type: string;
          date: string;
          description: string;
          status: string;
          citations: Array<{
            code: string;
            description: string;
            category: string;
            date: string;
            correctionDate: string;
          }>;
        }> = [];

        // Find enforcement/violation tables
        const tables = Array.from(document.querySelectorAll('table'));

        for (const table of tables) {
          const headerRow = table.querySelector('tr');
          if (!headerRow) continue;

          const headers = Array.from(headerRow.querySelectorAll('th, td'))
            .map((cell: Element) => cell.textContent?.toLowerCase().trim() || '');

          // Check if this is enforcement or violation table
          const isEnforcementTable = headers.some(h =>
            h.includes('enforcement') || h.includes('action') || h.includes('sanction')
          );

          const isViolationTable = headers.some(h =>
            h.includes('tag') || h.includes('deficiency') || h.includes('violation') ||
            h.includes('citation') || h.includes('regulation')
          );

          if (isEnforcementTable) {
            const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('action'));
            const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('effective'));
            const descIdx = headers.findIndex(h => h.includes('description') || h.includes('detail'));
            const statusIdx = headers.findIndex(h => h.includes('status'));

            const rows = table.querySelectorAll('tr');
            for (let i = 1; i < rows.length; i++) {
              const cells = rows[i].querySelectorAll('td');
              if (cells.length < 2) continue;

              results.push({
                type: typeIdx >= 0 && cells[typeIdx] ? cells[typeIdx].textContent?.trim() || '' : '',
                date: dateIdx >= 0 && cells[dateIdx] ? cells[dateIdx].textContent?.trim() || '' : '',
                description: descIdx >= 0 && cells[descIdx] ? cells[descIdx].textContent?.trim() || '' : '',
                status: statusIdx >= 0 && cells[statusIdx] ? cells[statusIdx].textContent?.trim() || '' : '',
                citations: [],
              });
            }
          }

          if (isViolationTable) {
            const tagIdx = headers.findIndex(h => h.includes('tag') || h.includes('code'));
            const descIdx = headers.findIndex(h => h.includes('deficiency') || h.includes('description') || h.includes('violation'));
            const catIdx = headers.findIndex(h => h.includes('category') || h.includes('type'));
            const dateIdx = headers.findIndex(h => h.includes('survey') || h.includes('date'));
            const corrIdx = headers.findIndex(h => h.includes('correction') || h.includes('resolved'));

            const rows = table.querySelectorAll('tr');
            for (let i = 1; i < rows.length; i++) {
              const cells = rows[i].querySelectorAll('td');
              if (cells.length < 2) continue;

              // Add as citation
              if (results.length === 0) {
                results.push({
                  type: 'Citation',
                  date: '',
                  description: '',
                  status: '',
                  citations: [],
                });
              }

              results[results.length - 1].citations.push({
                code: tagIdx >= 0 && cells[tagIdx] ? cells[tagIdx].textContent?.trim() || '' : '',
                description: descIdx >= 0 && cells[descIdx] ? cells[descIdx].textContent?.trim() || '' : cells[1]?.textContent?.trim() || '',
                category: catIdx >= 0 && cells[catIdx] ? cells[catIdx].textContent?.trim() || '' : '',
                date: dateIdx >= 0 && cells[dateIdx] ? cells[dateIdx].textContent?.trim() || '' : '',
                correctionDate: corrIdx >= 0 && cells[corrIdx] ? cells[corrIdx].textContent?.trim() || '' : '',
              });
            }
          }
        }

        return results;
      });

      // Convert to enforcements and violations
      for (const data of enforcementData) {
        if (data.type) {
          enforcements.push({
            facilityLicenseNumber: licenseNumber,
            enforcementType: data.type,
            effectiveDate: this.parseDate(data.date) || new Date(),
            description: data.description,
            status: data.status || 'ACTIVE',
          });
        }

        for (const citation of data.citations) {
          if (citation.description || citation.code) {
            violations.push({
              facilityLicenseNumber: licenseNumber,
              violationCode: citation.code || `VIO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              category: citation.category || 'QUALITY_OF_CARE',
              description: citation.description,
              severity: this.classifyViolationSeverity(citation.description),
              citationDate: this.parseDate(citation.date) || new Date(),
              correctionDate: this.parseDate(citation.correctionDate),
              status: citation.correctionDate ? 'CORRECTED' : 'CITED',
            });
          }
        }
      }

    } catch (error) {
      console.error('Error extracting enforcements:', error);
    }

    return { enforcements, violations };
  }

  private async extractFromCurrentPage(licenseNumber: string): Promise<{
    facility: Partial<ScrapedFacility> | null;
    violations: ScrapedViolation[];
    inspections: ScrapedInspection[];
  }> {
    // Combine extraction methods for when tabs aren't present
    const facility = await this.extractDetailsTab();
    const inspections = await this.extractInspectionsTab(licenseNumber);
    const { violations } = await this.extractEnforcementsTab(licenseNumber);

    return { facility, violations, inspections };
  }

  private async downloadAndParsePDF(selector: string): Promise<string | null> {
    if (!this.page) return null;

    try {
      // Get the PDF URL
      const pdfUrl = await this.page.evaluate((sel) => {
        const link = document.querySelector(sel) as HTMLAnchorElement;
        return link?.href || null;
      }, selector);

      if (!pdfUrl) return null;

      // Check if already downloaded
      if (this.downloadedPDFs.has(pdfUrl)) {
        return this.downloadedPDFs.get(pdfUrl) || null;
      }

      console.log(`        Downloading PDF: ${pdfUrl.substring(0, 80)}...`);

      // Download PDF using fetch in page context
      const pdfBuffer = await this.page.evaluate(async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const buffer = await response.arrayBuffer();
          return Array.from(new Uint8Array(buffer));
        } catch {
          return null;
        }
      }, pdfUrl);

      if (!pdfBuffer) return null;

      // Parse PDF
      const buffer = Buffer.from(pdfBuffer);
      const pdfData = await pdfParse(buffer);
      const content = pdfData.text;

      // Cache the result
      this.downloadedPDFs.set(pdfUrl, content);

      console.log(`        Extracted ${content.length} characters from PDF`);
      return content;

    } catch (error) {
      console.log(`        PDF parsing error:`, error);
      return null;
    }
  }

  private async returnToSearchResults(letter: string, targetPage: number): Promise<void> {
    if (!this.page) return;

    try {
      await this.page.goBack({ waitUntil: 'networkidle2', timeout: 30000 });
      await this.delay(1000);

      // Check if we need to navigate to a specific page
      if (targetPage > 1) {
        await this.navigateToPage(targetPage);
      }
    } catch (error) {
      // If goBack fails, navigate directly
      await this.page.goto(
        `${CONFIG.sodSearch.providerSearchUrl}?ProviderName=${letter}`,
        { waitUntil: 'networkidle2', timeout: CONFIG.timeout }
      );
      if (targetPage > 1) {
        await this.navigateToPage(targetPage);
      }
    }
  }

  private async navigateToPage(pageNum: number): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Look for page number links
      const clicked = await this.page.evaluate((targetPage) => {
        const links = Array.from(document.querySelectorAll('a'));
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          const text = link.textContent?.trim() || '';

          // Check for page number in href or text
          if (href.includes(`Page$${targetPage}`) || text === String(targetPage)) {
            link.click();
            return true;
          }
        }
        return false;
      }, pageNum);

      if (clicked) {
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        await this.delay(1000);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async navigateToNextPage(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const clicked = await this.page.evaluate(() => {
        // Look for next page elements
        const nextSelectors = [
          'input[type="image"][src*="next"]',
          'input[type="image"][alt*="Next"]',
          'a[href*="Page$Next"]',
          'a:has-text("Next")',
          'input[value="Next"]',
          'button:has-text("Next")',
        ];

        for (const selector of nextSelectors) {
          const el = document.querySelector(selector) as HTMLElement;
          if (el) {
            el.click();
            return true;
          }
        }

        // Also try finding ">" or ">>" links
        const links = Array.from(document.querySelectorAll('a'));
        for (const link of links) {
          const text = link.textContent?.trim();
          if (text === '>' || text === '>>' || text === 'Next') {
            link.click();
            return true;
          }
        }

        return false;
      });

      if (clicked) {
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        await this.delay(1000);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private parseCityFromCityState(cityState: string): string {
    // Format: "City AZ 12345" or "City, AZ 12345"
    const match = cityState.match(/^([A-Za-z\s]+?)(?:,?\s+AZ|\s+AZ\s+\d)/i);
    return match ? match[1].trim() : cityState.replace(/\s*AZ\s*\d*/i, '').trim();
  }

  private parseZipFromCityState(cityState: string): string {
    const match = cityState.match(/(\d{5})/);
    return match ? match[1] : '';
  }

  private classifyViolationSeverity(description: string): string {
    const descLower = (description || '').toLowerCase();

    if (descLower.includes('immediate jeopardy') ||
        descLower.includes('death') ||
        descLower.includes('serious harm') ||
        descLower.includes('life threatening')) {
      return 'CRITICAL';
    }

    if (descLower.includes('harm') ||
        descLower.includes('abuse') ||
        descLower.includes('neglect') ||
        descLower.includes('significant')) {
      return 'MAJOR';
    }

    if (descLower.includes('potential') ||
        descLower.includes('risk') ||
        descLower.includes('pattern')) {
      return 'MODERATE';
    }

    return 'MINOR';
  }

  private mapInspectionType(type: string): string {
    const typeLower = (type || '').toLowerCase();

    if (typeLower.includes('initial')) return 'INITIAL_LICENSURE';
    if (typeLower.includes('annual') || typeLower.includes('routine')) return 'ANNUAL_SURVEY';
    if (typeLower.includes('complaint')) return 'COMPLAINT_INVESTIGATION';
    if (typeLower.includes('follow')) return 'FOLLOW_UP';
    if (typeLower.includes('focus')) return 'FOCUSED';
    if (typeLower.includes('life safety') || typeLower.includes('fire')) return 'LIFE_SAFETY';

    return 'ANNUAL_SURVEY';
  }

  private mapFacilityType(type: string): string {
    const typeLower = (type || '').toLowerCase();

    if (typeLower.includes('memory') || typeLower.includes('dementia') || typeLower.includes('alzheimer')) {
      return 'MEMORY_CARE';
    }
    if (typeLower.includes('behavioral') || typeLower.includes('mental')) {
      return 'BEHAVIORAL_HEALTH';
    }
    if (typeLower.includes('foster') || typeLower.includes('group home')) {
      return 'ADULT_FOSTER_CARE';
    }
    if (typeLower.includes('continuing') || typeLower.includes('ccrc')) {
      return 'CONTINUING_CARE';
    }

    return 'ASSISTED_LIVING';
  }

  private mapLicenseStatus(status: string): string {
    const statusLower = (status || '').toLowerCase();

    if (statusLower.includes('provisional') || statusLower.includes('temp')) return 'PROVISIONAL';
    if (statusLower.includes('suspend')) return 'SUSPENDED';
    if (statusLower.includes('revok')) return 'REVOKED';
    if (statusLower.includes('expir')) return 'EXPIRED';
    if (statusLower.includes('pending')) return 'PENDING';

    return 'ACTIVE';
  }

  private mapViolationCategory(category: string): ViolationCategory {
    const catLower = (category || '').toLowerCase();

    if (catLower.includes('right')) return 'RESIDENT_RIGHTS';
    if (catLower.includes('quality') || catLower.includes('care')) return 'QUALITY_OF_CARE';
    if (catLower.includes('medication') || catLower.includes('drug') || catLower.includes('pharma')) return 'MEDICATION_MANAGEMENT';
    if (catLower.includes('staff')) return 'STAFFING';
    if (catLower.includes('physical') || catLower.includes('environment') || catLower.includes('building')) return 'PHYSICAL_ENVIRONMENT';
    if (catLower.includes('infection') || catLower.includes('sanit')) return 'INFECTION_CONTROL';
    if (catLower.includes('emergency') || catLower.includes('disaster') || catLower.includes('fire')) return 'EMERGENCY_PREPAREDNESS';
    if (catLower.includes('dietary') || catLower.includes('food') || catLower.includes('nutri')) return 'DIETARY_SERVICES';
    if (catLower.includes('admin') || catLower.includes('management')) return 'ADMINISTRATION';
    if (catLower.includes('record') || catLower.includes('document')) return 'RECORDS_DOCUMENTATION';

    return 'QUALITY_OF_CARE';
  }

  private mapViolationSeverity(severity: string): ViolationSeverity {
    const sevLower = (severity || '').toLowerCase();

    if (sevLower.includes('critical') || sevLower.includes('immediate') || sevLower.includes('jeopardy')) {
      return 'CRITICAL';
    }
    if (sevLower.includes('major') || sevLower.includes('high') || sevLower.includes('serious')) {
      return 'MAJOR';
    }
    if (sevLower.includes('moderate') || sevLower.includes('medium')) {
      return 'MODERATE';
    }

    return 'MINOR';
  }

  private mapViolationStatus(status: string): ViolationStatus {
    const statusLower = (status || '').toLowerCase();

    if (statusLower.includes('correct')) return 'CORRECTED';
    if (statusLower.includes('disput')) return 'DISPUTED';
    if (statusLower.includes('appeal')) return 'APPEALED';
    if (statusLower.includes('waiv')) return 'WAIVED';
    if (statusLower.includes('under') || statusLower.includes('progress')) return 'UNDER_CORRECTION';

    return 'CITED';
  }

  // Database save methods
  async saveFacilities(facilities: ScrapedFacility[]): Promise<{
    newCount: number;
    updatedCount: number;
    errors: string[];
  }> {
    const result = { newCount: 0, updatedCount: 0, errors: [] as string[] };

    const existingSlugs = await prisma.facility.findMany({
      select: { slug: true },
    });
    const slugSet = new Set(existingSlugs.map((f) => f.slug));

    for (const scrapedFacility of facilities) {
      try {
        const existing = await prisma.facility.findUnique({
          where: { licenseNumber: scrapedFacility.licenseNumber },
        });

        const slug = existing?.slug || generateUniqueSlug(
          scrapedFacility.name,
          Array.from(slugSet)
        );
        slugSet.add(slug);

        const facilityData: Prisma.FacilityCreateInput = {
          licenseNumber: scrapedFacility.licenseNumber,
          name: scrapedFacility.name,
          slug,
          address: scrapedFacility.address || 'Unknown',
          city: scrapedFacility.city || 'Unknown',
          state: scrapedFacility.state || 'AZ',
          zipCode: scrapedFacility.zipCode || '00000',
          county: scrapedFacility.county || 'Unknown',
          facilityType: this.mapFacilityType(scrapedFacility.facilityType) as never,
          licenseStatus: this.mapLicenseStatus(scrapedFacility.licenseStatus) as never,
          capacity: scrapedFacility.capacity || 0,
          specializations: scrapedFacility.specializations,
          licenseIssueDate: scrapedFacility.licenseIssueDate,
          licenseExpiryDate: scrapedFacility.licenseExpiryDate,
          lastInspectionDate: scrapedFacility.lastInspectionDate,
          dataSource: 'AZ DHS SOD',
          sourceUrl: scrapedFacility.sourceUrl,
          lastScrapedAt: new Date(),
        };

        if (existing) {
          await prisma.facility.update({
            where: { licenseNumber: scrapedFacility.licenseNumber },
            data: {
              ...facilityData,
              slug: existing.slug,
            },
          });
          result.updatedCount++;
        } else {
          await prisma.facility.create({
            data: facilityData,
          });
          result.newCount++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error saving facility ${scrapedFacility.name}: ${errorMsg}`);
      }
    }

    return result;
  }

  async saveViolations(violations: ScrapedViolation[]): Promise<{
    newCount: number;
    errors: string[];
  }> {
    const result = { newCount: 0, errors: [] as string[] };

    for (const violation of violations) {
      try {
        const facility = await prisma.facility.findUnique({
          where: { licenseNumber: violation.facilityLicenseNumber },
        });

        if (!facility) {
          result.errors.push(`Facility not found: ${violation.facilityLicenseNumber}`);
          continue;
        }

        const existingViolation = await prisma.violation.findFirst({
          where: {
            facilityId: facility.id,
            violationCode: violation.violationCode,
            citationDate: violation.citationDate,
          },
        });

        if (existingViolation) continue;

        const severityScores: Record<ViolationSeverity, number> = {
          MINOR: 5,
          MODERATE: 15,
          MAJOR: 35,
          CRITICAL: 60,
        };
        const severity = this.mapViolationSeverity(violation.severity);
        const severityScore = severityScores[severity];

        await prisma.violation.create({
          data: {
            facilityId: facility.id,
            violationCode: violation.violationCode,
            category: this.mapViolationCategory(violation.category),
            description: violation.description,
            severity,
            regulationCitation: violation.regulationCitation,
            citationDate: violation.citationDate,
            correctionDueDate: violation.correctionDueDate,
            correctionDate: violation.correctionDate,
            status: this.mapViolationStatus(violation.status),
            isRepeat: false,
            severityScore,
          },
        });

        result.newCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error saving violation: ${errorMsg}`);
      }
    }

    return result;
  }

  async saveInspections(inspections: ScrapedInspection[]): Promise<{
    newCount: number;
    errors: string[];
  }> {
    const result = { newCount: 0, errors: [] as string[] };

    for (const inspection of inspections) {
      try {
        const facility = await prisma.facility.findUnique({
          where: { licenseNumber: inspection.facilityLicenseNumber },
        });

        if (!facility) {
          result.errors.push(`Facility not found: ${inspection.facilityLicenseNumber}`);
          continue;
        }

        const existingInspection = await prisma.inspection.findFirst({
          where: {
            facilityId: facility.id,
            inspectionDate: inspection.inspectionDate,
            inspectionType: inspection.inspectionType as never,
          },
        });

        if (existingInspection) continue;

        await prisma.inspection.create({
          data: {
            facilityId: facility.id,
            inspectionType: inspection.inspectionType as never,
            inspectionDate: inspection.inspectionDate,
            exitDate: inspection.exitDate,
            overallResult: inspection.overallResult as never,
            violationCount: inspection.violationCount,
            reportUrl: inspection.reportUrl,
          },
        });

        await prisma.facility.update({
          where: { id: facility.id },
          data: { lastInspectionDate: inspection.inspectionDate },
        });

        result.newCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error saving inspection: ${errorMsg}`);
      }
    }

    return result;
  }

  // Main run method
  async run(options?: { fullRefresh?: boolean }): Promise<ScraperResult> {
    console.log('='.repeat(60));
    console.log('Starting AZ DHS SOD Comprehensive Scraper');
    console.log('='.repeat(60));

    this.startTime = Date.now();
    this.processedFacilities.clear();
    this.downloadedPDFs.clear();

    const result: ScraperResult = {
      success: true,
      facilitiesFound: 0,
      facilitiesNew: 0,
      facilitiesUpdated: 0,
      violationsFound: 0,
      violationsNew: 0,
      inspectionsFound: 0,
      enforcementsFound: 0,
      errors: [],
      duration: 0,
    };

    const scraperRun = await prisma.scraperRun.create({
      data: {
        scraperName: 'az-dhs-sod-comprehensive',
        status: 'RUNNING',
      },
    });

    try {
      await this.initialize();

      console.log('\nScraping facilities with tab navigation and PDF extraction...\n');
      const { facilities, violations, inspections, enforcements } = await this.scrapeFacilitiesFromSOD();

      result.facilitiesFound = facilities.length;
      result.violationsFound = violations.length;
      result.inspectionsFound = inspections.length;
      result.enforcementsFound = enforcements.length;

      console.log('\n' + '='.repeat(60));
      console.log('SCRAPING SUMMARY');
      console.log('='.repeat(60));
      console.log(`Facilities found: ${facilities.length}`);
      console.log(`Violations found: ${violations.length}`);
      console.log(`Inspections found: ${inspections.length}`);
      console.log(`Enforcements found: ${enforcements.length}`);
      console.log('='.repeat(60));

      // Save to database
      if (facilities.length > 0) {
        console.log('\nSaving facilities to database...');
        const saveResult = await this.saveFacilities(facilities);
        result.facilitiesNew = saveResult.newCount;
        result.facilitiesUpdated = saveResult.updatedCount;
        result.errors.push(...saveResult.errors);
        console.log(`  New: ${saveResult.newCount}, Updated: ${saveResult.updatedCount}`);
      }

      if (violations.length > 0) {
        console.log('Saving violations to database...');
        const violationResult = await this.saveViolations(violations);
        result.violationsNew = violationResult.newCount;
        result.errors.push(...violationResult.errors);
        console.log(`  New violations: ${violationResult.newCount}`);
      }

      if (inspections.length > 0) {
        console.log('Saving inspections to database...');
        const inspectionResult = await this.saveInspections(inspections);
        result.errors.push(...inspectionResult.errors);
        console.log(`  New inspections: ${inspectionResult.newCount}`);
      }

      result.duration = Date.now() - this.startTime;

      await prisma.scraperRun.update({
        where: { id: scraperRun.id },
        data: {
          status: 'COMPLETED' as ScraperStatus,
          completedAt: new Date(),
          facilitiesFound: result.facilitiesFound,
          facilitiesNew: result.facilitiesNew,
          facilitiesUpdated: result.facilitiesUpdated,
          violationsFound: result.violationsFound,
          errorsCount: result.errors.length,
          errorLog: result.errors.length > 0 ? result.errors.slice(0, 100) : undefined,
        },
      });

      console.log('\n' + '='.repeat(60));
      console.log('SCRAPER COMPLETED');
      console.log(`Duration: ${Math.round(result.duration / 1000)} seconds`);
      console.log('='.repeat(60));

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.success = false;
      result.errors.push(errorMsg);
      result.duration = Date.now() - this.startTime;

      await prisma.scraperRun.update({
        where: { id: scraperRun.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorsCount: 1,
          errorLog: [errorMsg],
        },
      });

      throw error;
    } finally {
      await this.close();
    }
  }
}

export const azDHSScraper = new ArizonaDHSScraper();
