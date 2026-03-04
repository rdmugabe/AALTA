'use client';

import { useRouter } from 'next/navigation';
import { Filter } from 'lucide-react';
import { Button } from '@aalta/ui';
import { SearchAutocomplete } from './SearchAutocomplete';

interface FacilitiesSearchBarProps {
  defaultQuery?: string;
}

export function FacilitiesSearchBar({ defaultQuery }: FacilitiesSearchBarProps) {
  const router = useRouter();

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <SearchAutocomplete
          placeholder="Search facilities by name, city, or license number..."
          className="w-full"
        />
      </div>
      <Button variant="outline" type="button">
        <Filter className="h-4 w-4 mr-2" />
        Filters
      </Button>
    </div>
  );
}
