/**
 * Generate a URL-safe slug from a facility name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
}

/**
 * Generate a unique slug by appending a suffix if needed
 */
export function generateUniqueSlug(name: string, existingSlugs: string[]): string {
  const baseSlug = generateSlug(name);

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Normalize city name for URL usage
 */
export function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Normalize state to two-letter code
 */
export function normalizeState(state: string): string {
  const stateMap: Record<string, string> = {
    'arizona': 'AZ',
    'az': 'AZ',
    // Add more states as needed for future expansion
  };

  const normalized = state.toLowerCase().trim();
  return stateMap[normalized] || state.toUpperCase().substring(0, 2);
}
