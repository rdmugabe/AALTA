import Link from 'next/link';
import { MapPin, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';
import { Card, CardContent, ScoreBadge, RiskBadge, Badge } from '@aalta/ui';
import { formatDate } from '@aalta/shared';

interface FacilityCardProps {
  facility: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
    facilityType: string;
    licenseStatus: string;
    capacity: number;
    complianceScore: number | null;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | null;
    violationCount: number;
    lastInspectionDate: Date | null;
  };
}

const facilityTypeLabels: Record<string, string> = {
  ASSISTED_LIVING: 'Assisted Living',
  MEMORY_CARE: 'Memory Care',
  ADULT_FOSTER_CARE: 'Adult Foster Care',
  BEHAVIORAL_HEALTH: 'Behavioral Health',
  CONTINUING_CARE: 'Continuing Care',
};

const licenseStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PROVISIONAL: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REVOKED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-blue-100 text-blue-800',
};

export function FacilityCard({ facility }: FacilityCardProps) {
  return (
    <Link href={`/facilities/arizona/${facility.city.toLowerCase()}/${facility.slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex gap-6">
            {/* Score */}
            <div className="flex-shrink-0">
              <ScoreBadge score={facility.complianceScore} size="lg" showLabel />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 truncate">
                    {facility.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {facility.city}, {facility.state}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>{facilityTypeLabels[facility.facilityType]}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    licenseStatusColors[facility.licenseStatus]
                  }`}
                >
                  {facility.licenseStatus}
                </span>
                <RiskBadge risk={facility.riskLevel} size="sm" />
                <span className="text-sm text-slate-500">
                  Capacity: {facility.capacity} beds
                </span>
              </div>

              <div className="flex items-center gap-6 mt-4 text-sm">
                {facility.violationCount > 0 && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {facility.violationCount} violation
                      {facility.violationCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {facility.lastInspectionDate && (
                  <div className="flex items-center gap-1 text-slate-500">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Last inspection: {formatDate(facility.lastInspectionDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
