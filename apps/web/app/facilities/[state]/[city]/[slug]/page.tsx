import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  MapPin,
  Phone,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  FileText,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, ScoreBadge, RiskBadge, Badge, Button } from '@aalta/ui';
import { formatDate } from '@aalta/shared';

interface Facility {
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
  complianceScore: number | null;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | null;
  lastInspectionDate: Date | null;
  licenseIssueDate: Date | null;
  licenseExpiryDate: Date | null;
  violations: Array<{
    id: string;
    violationCode: string;
    category: string;
    description: string;
    severity: string;
    citationDate: Date;
    correctionDate: Date | null;
    status: string;
    isRepeat: boolean;
  }>;
  inspections: Array<{
    id: string;
    inspectionType: string;
    inspectionDate: Date;
    overallResult: string;
    violationCount: number;
  }>;
  scoringHistory: Array<{
    id: string;
    calculatedAt: Date;
    complianceScore: number;
    riskLevel: string;
  }>;
}

async function getFacility(slug: string): Promise<Facility | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  try {
    const response = await fetch(
      `${apiUrl}/trpc/facility.getBySlug?input=${encodeURIComponent(JSON.stringify({ json: { slug } }))}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.result?.data?.json || null;
  } catch (error) {
    console.error('Failed to fetch facility:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const facility = await getFacility(slug);

  if (!facility) {
    return { title: 'Facility Not Found | AALTA' };
  }

  return {
    title: `${facility.name} | AALTA`,
    description: `View compliance information, inspection history, and violations for ${facility.name} in ${facility.city}, Arizona.`,
  };
}

const facilityTypeLabels: Record<string, string> = {
  ASSISTED_LIVING: 'Assisted Living',
  MEMORY_CARE: 'Memory Care',
  ADULT_FOSTER_CARE: 'Adult Foster Care',
  BEHAVIORAL_HEALTH: 'Behavioral Health',
  CONTINUING_CARE: 'Continuing Care',
};

const severityColors: Record<string, string> = {
  MINOR: 'bg-blue-100 text-blue-800',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  MAJOR: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const licenseStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PROVISIONAL: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REVOKED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-blue-100 text-blue-800',
};

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ state: string; city: string; slug: string }>;
}) {
  const { slug } = await params;
  const facility = await getFacility(slug);

  if (!facility) {
    notFound();
  }

  const activeViolations = facility.violations?.filter((v) => v.status !== 'CORRECTED') || [];
  const recentInspections = facility.inspections?.slice(0, 5) || [];

  return (
    <div className="py-8">
      <div className="container-page">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            href="/facilities"
            className="inline-flex items-center text-sm text-aalta-600 hover:text-aalta-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Directory
          </Link>
        </nav>

        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Left: Main Info */}
          <div className="flex-1">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <ScoreBadge score={facility.complianceScore} size="xl" showLabel />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{facility.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      licenseStatusColors[facility.licenseStatus]
                    }`}
                  >
                    {facility.licenseStatus}
                  </span>
                  <RiskBadge risk={facility.riskLevel} />
                  <span className="text-sm text-slate-500">
                    {facilityTypeLabels[facility.facilityType]}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>
                  {facility.address}, {facility.city}, {facility.state} {facility.zipCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>Capacity: {facility.capacity} beds</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span>License #: {facility.licenseNumber}</span>
              </div>
              {facility.lastInspectionDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Last Inspection: {formatDate(facility.lastInspectionDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick Stats */}
          <div className="flex flex-row lg:flex-col gap-4">
            <Card className="flex-1">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {facility.violations?.length || 0}
                </div>
                <div className="text-sm text-slate-500">Total Violations</div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{activeViolations.length}</div>
                <div className="text-sm text-slate-500">Active Issues</div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {facility.inspections?.length || 0}
                </div>
                <div className="text-sm text-slate-500">Inspections</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Violations Section */}
            <Card>
              <CardHeader className="border-b border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Violations & Citations
                  </h2>
                  {facility.violations && facility.violations.length > 0 && (
                    <span className="text-sm text-slate-500">
                      {facility.violations.length} total
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {facility.violations && facility.violations.length > 0 ? (
                  <div className="space-y-4">
                    {facility.violations.map((violation) => (
                      <div
                        key={violation.id}
                        className="border border-slate-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  severityColors[violation.severity]
                                }`}
                              >
                                {violation.severity}
                              </span>
                              <span className="text-sm text-slate-500">{violation.category}</span>
                              {violation.isRepeat && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  REPEAT
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-sm text-slate-700">{violation.description}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {violation.status === 'CORRECTED' ? (
                              <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle className="h-4 w-4" />
                                Corrected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600 text-sm">
                                <Clock className="h-4 w-4" />
                                {violation.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Cited: {formatDate(violation.citationDate)}
                          {violation.correctionDate && (
                            <span> | Corrected: {formatDate(violation.correctionDate)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                    <p className="text-slate-600">No violations on record</p>
                    <p className="text-sm text-slate-500 mt-1">
                      This facility has no cited violations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inspection History */}
            <Card>
              <CardHeader className="border-b border-slate-200 p-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Inspection History
                </h2>
              </CardHeader>
              <CardContent className="p-4">
                {recentInspections.length > 0 ? (
                  <div className="space-y-3">
                    {recentInspections.map((inspection) => (
                      <div
                        key={inspection.id}
                        className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <div className="font-medium text-slate-900">
                            {inspection.inspectionType.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-slate-500">
                            {formatDate(inspection.inspectionDate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-sm font-medium ${
                              inspection.overallResult === 'NO_DEFICIENCIES'
                                ? 'text-green-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {inspection.overallResult.replace(/_/g, ' ')}
                          </div>
                          {inspection.violationCount > 0 && (
                            <div className="text-xs text-slate-500">
                              {inspection.violationCount} violation
                              {inspection.violationCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-600">No inspection records available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* License Info */}
            <Card>
              <CardHeader className="border-b border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-400" />
                  License Information
                </h3>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      licenseStatusColors[facility.licenseStatus]
                    }`}
                  >
                    {facility.licenseStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">License #</span>
                  <span className="text-slate-900">{facility.licenseNumber}</span>
                </div>
                {facility.licenseIssueDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Issued</span>
                    <span className="text-slate-900">{formatDate(facility.licenseIssueDate)}</span>
                  </div>
                )}
                {facility.licenseExpiryDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expires</span>
                    <span className="text-slate-900">{formatDate(facility.licenseExpiryDate)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">County</span>
                  <span className="text-slate-900">{facility.county}</span>
                </div>
              </CardContent>
            </Card>

            {/* Data Sources */}
            <Card>
              <CardHeader className="border-b border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">Data Sources</h3>
              </CardHeader>
              <CardContent className="p-4 text-sm text-slate-600">
                <p>
                  All compliance data is sourced from the Arizona Department of Health Services
                  (ADHS) public records.
                </p>
                <Link
                  href="/methodology"
                  className="inline-block mt-2 text-aalta-600 hover:text-aalta-700"
                >
                  Learn about our methodology →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
