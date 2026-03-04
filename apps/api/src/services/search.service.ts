import { MeiliSearch, Index } from 'meilisearch';
import { prisma } from '../db/client';

// Initialize Meilisearch client
const meiliClient = new MeiliSearch({
  host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || '',
});

// Index names
const INDEXES = {
  FACILITIES: 'facilities',
} as const;

// Facility document type for search
interface FacilityDocument {
  id: string;
  licenseNumber: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  facilityType: string;
  licenseStatus: string;
  capacity: number;
  specializations: string[];
  complianceScore: number | null;
  riskLevel: string | null;
  lastInspectionDate: string | null;
  violationCount: number;
  // Searchable text field combining multiple fields
  searchText: string;
}

// Search result type
interface FacilitySearchResult {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  facilityType: string;
  licenseStatus: string;
  complianceScore: number | null;
  riskLevel: string | null;
}

export class SearchService {
  private facilitiesIndex: Index<FacilityDocument> | null = null;

  // Initialize indexes
  async initialize(): Promise<void> {
    console.log('Initializing Meilisearch indexes...');

    try {
      // Create or get facilities index
      await meiliClient.createIndex(INDEXES.FACILITIES, { primaryKey: 'id' });
    } catch (error) {
      // Index might already exist
      console.log('Facilities index already exists or error creating:', error);
    }

    this.facilitiesIndex = meiliClient.index(INDEXES.FACILITIES);

    // Configure searchable attributes
    await this.facilitiesIndex.updateSearchableAttributes([
      'name',
      'searchText',
      'city',
      'county',
      'address',
      'licenseNumber',
      'specializations',
    ]);

    // Configure filterable attributes
    await this.facilitiesIndex.updateFilterableAttributes([
      'facilityType',
      'licenseStatus',
      'riskLevel',
      'city',
      'county',
      'state',
      'complianceScore',
    ]);

    // Configure sortable attributes
    await this.facilitiesIndex.updateSortableAttributes([
      'name',
      'complianceScore',
      'violationCount',
      'city',
    ]);

    // Configure ranking rules
    await this.facilitiesIndex.updateRankingRules([
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'complianceScore:desc',
    ]);

    console.log('Meilisearch indexes initialized');
  }

  // Index a single facility
  async indexFacility(facilityId: string): Promise<void> {
    if (!this.facilitiesIndex) {
      await this.initialize();
    }

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        violations: {
          select: { id: true },
        },
      },
    });

    if (!facility) {
      throw new Error(`Facility not found: ${facilityId}`);
    }

    const document: FacilityDocument = {
      id: facility.id,
      licenseNumber: facility.licenseNumber,
      name: facility.name,
      slug: facility.slug,
      address: facility.address,
      city: facility.city,
      state: facility.state,
      zipCode: facility.zipCode,
      county: facility.county,
      facilityType: facility.facilityType,
      licenseStatus: facility.licenseStatus,
      capacity: facility.capacity,
      specializations: facility.specializations,
      complianceScore: facility.complianceScore ? Number(facility.complianceScore) : null,
      riskLevel: facility.riskLevel,
      lastInspectionDate: facility.lastInspectionDate?.toISOString() || null,
      violationCount: facility.violations.length,
      // Create searchable text combining multiple fields
      searchText: [
        facility.name,
        facility.address,
        facility.city,
        facility.county,
        facility.licenseNumber,
        ...facility.specializations,
      ].join(' '),
    };

    await this.facilitiesIndex!.addDocuments([document]);
  }

  // Index all facilities
  async indexAllFacilities(): Promise<{ indexed: number; errors: number }> {
    if (!this.facilitiesIndex) {
      await this.initialize();
    }

    console.log('Indexing all facilities...');

    const facilities = await prisma.facility.findMany({
      include: {
        violations: {
          select: { id: true },
        },
      },
    });

    const documents: FacilityDocument[] = facilities.map((facility) => ({
      id: facility.id,
      licenseNumber: facility.licenseNumber,
      name: facility.name,
      slug: facility.slug,
      address: facility.address,
      city: facility.city,
      state: facility.state,
      zipCode: facility.zipCode,
      county: facility.county,
      facilityType: facility.facilityType,
      licenseStatus: facility.licenseStatus,
      capacity: facility.capacity,
      specializations: facility.specializations,
      complianceScore: facility.complianceScore ? Number(facility.complianceScore) : null,
      riskLevel: facility.riskLevel,
      lastInspectionDate: facility.lastInspectionDate?.toISOString() || null,
      violationCount: facility.violations.length,
      searchText: [
        facility.name,
        facility.address,
        facility.city,
        facility.county,
        facility.licenseNumber,
        ...facility.specializations,
      ].join(' '),
    }));

    // Add documents in batches
    const batchSize = 100;
    let indexed = 0;
    let errors = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      try {
        await this.facilitiesIndex!.addDocuments(batch);
        indexed += batch.length;
        console.log(`Indexed ${indexed}/${documents.length} facilities`);
      } catch (error) {
        console.error(`Error indexing batch starting at ${i}:`, error);
        errors += batch.length;
      }
    }

    console.log(`Indexing complete: ${indexed} indexed, ${errors} errors`);
    return { indexed, errors };
  }

  // Remove a facility from the index
  async removeFacility(facilityId: string): Promise<void> {
    if (!this.facilitiesIndex) {
      await this.initialize();
    }

    await this.facilitiesIndex!.deleteDocument(facilityId);
  }

  // Search facilities
  async searchFacilities(
    query: string,
    options?: {
      filter?: string;
      sort?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    hits: FacilitySearchResult[];
    estimatedTotalHits: number;
    processingTimeMs: number;
  }> {
    if (!this.facilitiesIndex) {
      await this.initialize();
    }

    const result = await this.facilitiesIndex!.search(query, {
      filter: options?.filter,
      sort: options?.sort,
      limit: options?.limit || 20,
      offset: options?.offset || 0,
      attributesToRetrieve: [
        'id',
        'name',
        'slug',
        'city',
        'state',
        'facilityType',
        'licenseStatus',
        'complianceScore',
        'riskLevel',
      ],
    });

    return {
      hits: result.hits as FacilitySearchResult[],
      estimatedTotalHits: result.estimatedTotalHits || 0,
      processingTimeMs: result.processingTimeMs,
    };
  }

  // Get index stats
  async getStats(): Promise<{
    numberOfDocuments: number;
    isIndexing: boolean;
  }> {
    if (!this.facilitiesIndex) {
      await this.initialize();
    }

    const stats = await this.facilitiesIndex!.getStats();
    return {
      numberOfDocuments: stats.numberOfDocuments,
      isIndexing: stats.isIndexing,
    };
  }

  // Clear all facilities from index
  async clearIndex(): Promise<void> {
    if (!this.facilitiesIndex) {
      await this.initialize();
    }

    await this.facilitiesIndex!.deleteAllDocuments();
  }
}

// Export singleton instance
export const searchService = new SearchService();
