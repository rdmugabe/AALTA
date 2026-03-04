// ============ STATES ============

export const SUPPORTED_STATES = {
  AZ: {
    code: 'AZ',
    name: 'Arizona',
    slug: 'arizona',
    dhsUrl: 'https://azcarecheck.com',
  },
} as const;

export type SupportedStateCode = keyof typeof SUPPORTED_STATES;

// ============ ARIZONA COUNTIES ============

export const ARIZONA_COUNTIES = [
  'Apache',
  'Cochise',
  'Coconino',
  'Gila',
  'Graham',
  'Greenlee',
  'La Paz',
  'Maricopa',
  'Mohave',
  'Navajo',
  'Pima',
  'Pinal',
  'Santa Cruz',
  'Yavapai',
  'Yuma',
] as const;

export type ArizonaCounty = (typeof ARIZONA_COUNTIES)[number];

// ============ MAJOR CITIES ============

export const ARIZONA_MAJOR_CITIES = [
  'Phoenix',
  'Tucson',
  'Mesa',
  'Chandler',
  'Scottsdale',
  'Glendale',
  'Gilbert',
  'Tempe',
  'Peoria',
  'Surprise',
  'Yuma',
  'Avondale',
  'Goodyear',
  'Flagstaff',
  'Buckeye',
  'Casa Grande',
  'Lake Havasu City',
  'Maricopa',
  'Sierra Vista',
  'Prescott',
  'Sun City',
  'San Tan Valley',
  'Queen Creek',
  'Oro Valley',
] as const;

// ============ API CONSTANTS ============

export const API_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 100,
  },
} as const;

// ============ SCRAPER CONSTANTS ============

export const SCRAPER_CONFIG = {
  USER_AGENT: 'AALTA-Bot/1.0 (+https://aalta.org/bot; transparency@aalta.org)',
  RATE_LIMIT_MS: 6000, // 6 seconds between requests
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 10000, // 10 seconds
  TIMEOUT_MS: 30000, // 30 seconds
} as const;

// ============ SCORING CONSTANTS ============

export const ALGORITHM_VERSION = '1.0.0';

// ============ CACHE KEYS ============

export const CACHE_KEYS = {
  FACILITY_LIST: 'facility:list',
  FACILITY_DETAIL: 'facility:detail',
  FACILITY_STATS: 'facility:stats',
  SEARCH_RESULTS: 'search:results',
  CITY_LIST: 'city:list',
} as const;

export const CACHE_TTL = {
  SHORT: 60 * 5, // 5 minutes
  MEDIUM: 60 * 60, // 1 hour
  LONG: 60 * 60 * 24, // 24 hours
} as const;

// ============ SEO ============

export const SEO_CONFIG = {
  SITE_NAME: 'AALTA - Arizona Assisted Living Transparency Authority',
  SITE_DESCRIPTION:
    'Independent compliance intelligence platform providing transparency into Arizona assisted living facilities through public regulatory data.',
  DEFAULT_OG_IMAGE: '/og-image.png',
  TWITTER_HANDLE: '@aaborgsorg',
} as const;
