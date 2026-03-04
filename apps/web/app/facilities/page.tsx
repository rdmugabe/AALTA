import { Suspense } from 'react';
import Link from 'next/link';
import { Building2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button, Card, CardContent } from '@aalta/ui';
import { FacilityCard } from '@/components/facility/FacilityCard';
import { FacilitiesSearchBar } from '@/components/search/FacilitiesSearchBar';

// Fetch facilities from API
async function getFacilities(params: {
  q?: string;
  city?: string;
  type?: string;
  page?: string;
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const response = await fetch(
      `${apiUrl}/trpc/facility.list?input=${encodeURIComponent(JSON.stringify({
        json: {
          query: params.q || undefined,
          city: params.city || undefined,
          facilityType: params.type || undefined,
          page: parseInt(params.page || '1'),
          limit: 20,
        },
      }))}`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error('API error:', response.status);
      return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }

    const data = await response.json();
    return data.result?.data?.json || { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  } catch (error) {
    console.error('Failed to fetch facilities:', error);
    return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }
}

// Get stats for the sidebar
async function getStats() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const response = await fetch(
      `${apiUrl}/trpc/facility.getStats`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.result?.data?.json || null;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return null;
  }
}

export const metadata = {
  title: 'Facility Directory | AALTA',
  description: 'Search and compare Arizona assisted living facilities by compliance score, location, and more.',
};

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; type?: string; page?: string }>;
}) {
  // In Next.js 15, searchParams is a Promise that needs to be awaited
  const resolvedSearchParams = await searchParams;

  const [facilitiesData, stats] = await Promise.all([
    getFacilities(resolvedSearchParams),
    getStats(),
  ]);

  const facilities = facilitiesData.items || [];
  const pagination = facilitiesData.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };

  return (
    <div className="py-8">
      <div className="container-page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Facility Directory</h1>
          <p className="mt-2 text-slate-600">
            Search and compare Arizona assisted living facilities
          </p>
          {stats && (
            <div className="mt-4 flex gap-6 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {stats.totalFacilities || 0} facilities
              </span>
              {stats.byRiskLevel && (
                <>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    {stats.byRiskLevel.LOW || 0} low risk
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    {(stats.byRiskLevel.MODERATE || 0) + (stats.byRiskLevel.HIGH || 0)} elevated risk
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <FacilitiesSearchBar defaultQuery={resolvedSearchParams.q} />
        </div>

        {/* Results */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Filter by Type</h3>
                <div className="space-y-2">
                  <Link
                    href="/facilities"
                    className={`block px-3 py-2 rounded-md text-sm ${
                      !resolvedSearchParams.type ? 'bg-aalta-50 text-aalta-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Types
                  </Link>
                  <Link
                    href="/facilities?type=ASSISTED_LIVING"
                    className={`block px-3 py-2 rounded-md text-sm ${
                      resolvedSearchParams.type === 'ASSISTED_LIVING' ? 'bg-aalta-50 text-aalta-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Assisted Living
                  </Link>
                  <Link
                    href="/facilities?type=MEMORY_CARE"
                    className={`block px-3 py-2 rounded-md text-sm ${
                      resolvedSearchParams.type === 'MEMORY_CARE' ? 'bg-aalta-50 text-aalta-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Memory Care
                  </Link>
                  <Link
                    href="/facilities?type=ADULT_FOSTER_CARE"
                    className={`block px-3 py-2 rounded-md text-sm ${
                      resolvedSearchParams.type === 'ADULT_FOSTER_CARE' ? 'bg-aalta-50 text-aalta-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Adult Foster Care
                  </Link>
                </div>

                {stats?.cities && stats.cities.length > 0 && (
                  <>
                    <h3 className="font-semibold mb-4 mt-6">Top Cities</h3>
                    <div className="space-y-2">
                      {stats.cities.slice(0, 8).map((city: { city: string; count: number }) => (
                        <Link
                          key={city.city}
                          href={`/facilities?city=${encodeURIComponent(city.city)}`}
                          className={`flex justify-between px-3 py-2 rounded-md text-sm ${
                            resolvedSearchParams.city === city.city
                              ? 'bg-aalta-50 text-aalta-700 font-medium'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{city.city}</span>
                          <span className="text-slate-400">{city.count}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Facility List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600">
                Showing <span className="font-medium">{facilities.length}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> facilities
                {resolvedSearchParams.q && (
                  <span>
                    {' '}for &quot;{resolvedSearchParams.q}&quot;
                  </span>
                )}
              </p>
            </div>

            {facilities.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">No facilities found</h3>
                  <p className="text-slate-600">
                    Try adjusting your search or filters to find more results.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {facilities.map((facility: any) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex items-center gap-2">
                  {pagination.page > 1 && (
                    <Link href={`/facilities?${new URLSearchParams({ ...resolvedSearchParams, page: String(pagination.page - 1) }).toString()}`}>
                      <Button variant="outline" size="sm">
                        Previous
                      </Button>
                    </Link>
                  )}

                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Link
                        key={pageNum}
                        href={`/facilities?${new URLSearchParams({ ...resolvedSearchParams, page: String(pageNum) }).toString()}`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className={pageNum === pagination.page ? 'bg-aalta-50' : ''}
                        >
                          {pageNum}
                        </Button>
                      </Link>
                    );
                  })}

                  {pagination.page < pagination.totalPages && (
                    <Link href={`/facilities?${new URLSearchParams({ ...resolvedSearchParams, page: String(pagination.page + 1) }).toString()}`}>
                      <Button variant="outline" size="sm">
                        Next
                      </Button>
                    </Link>
                  )}
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
