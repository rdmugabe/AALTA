import { PrismaClient, FacilityType, LicenseStatus, RiskLevel, OwnerType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample facilities
  const facilities = [
    {
      licenseNumber: 'ALF-2024-001',
      name: 'Sunrise Senior Living - Phoenix',
      slug: 'sunrise-senior-living-phoenix',
      address: '123 Main Street',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
      county: 'Maricopa',
      latitude: 33.4484,
      longitude: -112.074,
      facilityType: FacilityType.ASSISTED_LIVING,
      licenseStatus: LicenseStatus.ACTIVE,
      capacity: 45,
      specializations: ['Memory Care', 'Respite Care'],
      complianceScore: 87.5,
      riskLevel: RiskLevel.LOW,
      scoreUpdatedAt: new Date(),
      dataSource: 'AZ DHS',
      sourceUrl: 'https://azcarecheck.com',
      lastScrapedAt: new Date(),
    },
    {
      licenseNumber: 'ALF-2024-002',
      name: 'Desert Gardens Assisted Living',
      slug: 'desert-gardens-assisted-living',
      address: '456 Oak Avenue',
      city: 'Scottsdale',
      state: 'AZ',
      zipCode: '85251',
      county: 'Maricopa',
      latitude: 33.4942,
      longitude: -111.9261,
      facilityType: FacilityType.MEMORY_CARE,
      licenseStatus: LicenseStatus.ACTIVE,
      capacity: 30,
      specializations: ['Alzheimer\'s Care', 'Dementia Care'],
      complianceScore: 72.3,
      riskLevel: RiskLevel.MODERATE,
      scoreUpdatedAt: new Date(),
      dataSource: 'AZ DHS',
      sourceUrl: 'https://azcarecheck.com',
      lastScrapedAt: new Date(),
    },
    {
      licenseNumber: 'ALF-2024-003',
      name: 'Mountain View Care Home',
      slug: 'mountain-view-care-home',
      address: '789 Pine Road',
      city: 'Tucson',
      state: 'AZ',
      zipCode: '85701',
      county: 'Pima',
      latitude: 32.2226,
      longitude: -110.9747,
      facilityType: FacilityType.ADULT_FOSTER_CARE,
      licenseStatus: LicenseStatus.ACTIVE,
      capacity: 10,
      specializations: ['Personal Care'],
      complianceScore: 95.0,
      riskLevel: RiskLevel.LOW,
      scoreUpdatedAt: new Date(),
      dataSource: 'AZ DHS',
      sourceUrl: 'https://azcarecheck.com',
      lastScrapedAt: new Date(),
    },
    {
      licenseNumber: 'ALF-2024-004',
      name: 'Valley Comfort Living',
      slug: 'valley-comfort-living',
      address: '321 Valley Drive',
      city: 'Mesa',
      state: 'AZ',
      zipCode: '85201',
      county: 'Maricopa',
      latitude: 33.4152,
      longitude: -111.8315,
      facilityType: FacilityType.ASSISTED_LIVING,
      licenseStatus: LicenseStatus.PROVISIONAL,
      capacity: 25,
      specializations: [],
      complianceScore: 58.2,
      riskLevel: RiskLevel.HIGH,
      scoreUpdatedAt: new Date(),
      dataSource: 'AZ DHS',
      sourceUrl: 'https://azcarecheck.com',
      lastScrapedAt: new Date(),
    },
  ];

  for (const facility of facilities) {
    const created = await prisma.facility.upsert({
      where: { licenseNumber: facility.licenseNumber },
      update: facility,
      create: facility,
    });

    // Add ownership record
    await prisma.ownership.upsert({
      where: {
        id: `owner-${created.id}`,
      },
      update: {},
      create: {
        id: `owner-${created.id}`,
        facilityId: created.id,
        ownerName: `${facility.name.split(' ')[0]} Holdings LLC`,
        ownerType: OwnerType.LLC,
        ownershipPct: 100,
        effectiveDate: new Date('2020-01-01'),
        isCurrent: true,
      },
    });

    console.log(`Created facility: ${created.name}`);
  }

  // Create admin user
  await prisma.user.upsert({
    where: { email: 'admin@aalta.org' },
    update: {},
    create: {
      email: 'admin@aalta.org',
      role: 'SUPER_ADMIN',
      firstName: 'Admin',
      lastName: 'User',
      organization: 'AALTA',
      emailVerified: true,
    },
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
