'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Building2, X, Loader2 } from 'lucide-react';
import { Input } from '@aalta/ui';

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  facilityType: string;
  complianceScore: number | null;
}

const facilityTypeLabels: Record<string, string> = {
  ASSISTED_LIVING: 'Assisted Living',
  MEMORY_CARE: 'Memory Care',
  ADULT_FOSTER_CARE: 'Adult Foster Care',
  BEHAVIORAL_HEALTH: 'Behavioral Health',
  CONTINUING_CARE: 'Continuing Care',
};

function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface SearchAutocompleteProps {
  placeholder?: string;
  className?: string;
  onSelect?: (result: SearchResult) => void;
}

export function SearchAutocomplete({
  placeholder = 'Search facilities by name, city, or license...',
  className = '',
  onSelect,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const searchFacilities = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(
        `${apiUrl}/trpc/search.quickSearch?input=${encodeURIComponent(
          JSON.stringify({ json: { query: searchQuery, limit: 8 } })
        )}`
      );

      if (response.ok) {
        const data = await response.json();
        const searchResults = data.result?.data?.json || [];
        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((q: string) => searchFacilities(q), 300),
    [searchFacilities]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    if (onSelect) {
      onSelect(result);
    } else {
      router.push(`/facilities/arizona/${result.city.toLowerCase()}/${result.slug}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        } else if (query.length >= 2) {
          // Navigate to search results page
          router.push(`/facilities?q=${encodeURIComponent(query)}`);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 85) return 'text-green-600';
    if (score >= 65) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 animate-spin" />
        )}
        {!isLoading && query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-slate-500 px-3 py-1">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
                  index === selectedIndex
                    ? 'bg-aalta-50 text-aalta-900'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Building2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{result.name}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {result.city}, {result.state}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span>{facilityTypeLabels[result.facilityType]}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {result.complianceScore !== null ? (
                      <div
                        className={`text-lg font-bold ${getScoreColor(result.complianceScore)}`}
                      >
                        {Math.round(result.complianceScore)}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">—</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 p-2">
            <button
              onClick={() => {
                router.push(`/facilities?q=${encodeURIComponent(query)}`);
                setIsOpen(false);
              }}
              className="w-full text-center py-2 text-sm text-aalta-600 hover:text-aalta-700 hover:bg-slate-50 rounded-md"
            >
              View all results for &quot;{query}&quot;
            </button>
          </div>
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-50 p-4 text-center">
          <p className="text-slate-600">No facilities found for &quot;{query}&quot;</p>
          <p className="text-sm text-slate-500 mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
