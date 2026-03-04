import { describe, it, expect } from 'vitest';
import { generateSlug, generateUniqueSlug, formatDate, formatCurrency, formatNumber } from './utils';

describe('generateSlug', () => {
  it('should convert a string to a slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
    expect(generateSlug('Sunrise Senior Living - Phoenix')).toBe('sunrise-senior-living-phoenix');
    expect(generateSlug('A & B Care Home')).toBe('a-b-care-home');
  });

  it('should handle special characters', () => {
    expect(generateSlug('Test!@#$%^&*()Home')).toBe('testhome');
    expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });

  it('should handle empty strings', () => {
    expect(generateSlug('')).toBe('');
  });
});

describe('generateUniqueSlug', () => {
  it('should generate a unique slug when there are no existing slugs', () => {
    const slug = generateUniqueSlug('Test Facility', []);
    expect(slug).toBe('test-facility');
  });

  it('should append a number when slug already exists', () => {
    const existingSlugs = ['test-facility'];
    const slug = generateUniqueSlug('Test Facility', existingSlugs);
    expect(slug).toBe('test-facility-2');
  });

  it('should increment number for multiple duplicates', () => {
    const existingSlugs = ['test-facility', 'test-facility-2', 'test-facility-3'];
    const slug = generateUniqueSlug('Test Facility', existingSlugs);
    expect(slug).toBe('test-facility-4');
  });
});

describe('formatDate', () => {
  it('should format a date to a readable string', () => {
    const date = new Date('2024-01-15');
    const formatted = formatDate(date);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('should handle Date objects', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    const formatted = formatDate(date);
    expect(formatted).toContain('2024');
  });
});

describe('formatCurrency', () => {
  it('should format a number as currency', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle negative numbers', () => {
    const formatted = formatCurrency(-500);
    expect(formatted).toContain('500');
  });
});

describe('formatNumber', () => {
  it('should format numbers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(0)).toBe('0');
  });

  it('should handle decimals', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
  });
});
