'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@aalta/ui';

const facilityTypes = [
  { value: 'ASSISTED_LIVING', label: 'Assisted Living' },
  { value: 'MEMORY_CARE', label: 'Memory Care' },
  { value: 'ADULT_FOSTER_CARE', label: 'Adult Foster Care' },
  { value: 'BEHAVIORAL_HEALTH', label: 'Behavioral Health' },
  { value: 'CONTINUING_CARE', label: 'Continuing Care' },
];

const riskLevels = [
  { value: 'LOW', label: 'Low Risk', color: 'bg-green-100' },
  { value: 'MODERATE', label: 'Moderate Risk', color: 'bg-yellow-100' },
  { value: 'HIGH', label: 'High Risk', color: 'bg-orange-100' },
  { value: 'CRITICAL', label: 'Critical Risk', color: 'bg-red-100' },
];

const cities = [
  'Phoenix',
  'Tucson',
  'Mesa',
  'Scottsdale',
  'Chandler',
  'Glendale',
  'Gilbert',
  'Tempe',
  'Peoria',
  'Surprise',
];

export function SearchFilters() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* City Filter */}
        <div>
          <label className="text-sm font-medium text-slate-900">City</label>
          <select className="mt-2 w-full border border-slate-200 rounded-md px-3 py-2 text-sm">
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city.toLowerCase()}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Facility Type Filter */}
        <div>
          <label className="text-sm font-medium text-slate-900">Facility Type</label>
          <div className="mt-2 space-y-2">
            {facilityTypes.map((type) => (
              <label key={type.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-aalta-600 focus:ring-aalta-500"
                />
                <span className="text-sm text-slate-700">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Risk Level Filter */}
        <div>
          <label className="text-sm font-medium text-slate-900">Risk Level</label>
          <div className="mt-2 space-y-2">
            {riskLevels.map((level) => (
              <label key={level.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-aalta-600 focus:ring-aalta-500"
                />
                <span
                  className={`inline-block w-3 h-3 rounded-full ${level.color}`}
                />
                <span className="text-sm text-slate-700">{level.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Compliance Score Range */}
        <div>
          <label className="text-sm font-medium text-slate-900">
            Minimum Compliance Score
          </label>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="0"
            className="mt-2 w-full"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* License Status */}
        <div>
          <label className="text-sm font-medium text-slate-900">License Status</label>
          <div className="mt-2 space-y-2">
            {['Active', 'Provisional', 'Suspended'].map((status) => (
              <label key={status} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={status === 'Active'}
                  className="rounded border-slate-300 text-aalta-600 focus:ring-aalta-500"
                />
                <span className="text-sm text-slate-700">{status}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-200">
          <Button variant="outline" className="w-full">
            Reset Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
