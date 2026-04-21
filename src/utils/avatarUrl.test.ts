/**
 * Tests de utils/avatarUrl — genera URL del servicio ui-avatars.com
 * con defaults sensatos y opciones opcionales de color.
 */
import { describe, it, expect } from 'vitest';
import { avatarUrl } from './avatarUrl';

describe('avatarUrl', () => {
  it('uses ui-avatars.com as base host', () => {
    const url = avatarUrl('Ana Lopez');
    expect(url.startsWith('https://ui-avatars.com/api/')).toBe(true);
  });

  it('includes the name parameter URL-encoded', () => {
    const url = avatarUrl('Ana Lopez');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('name')).toBe('Ana Lopez');
  });

  it('defaults background to "random" when not specified', () => {
    const url = avatarUrl('John');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('background')).toBe('random');
  });

  it('does not set color by default', () => {
    const url = avatarUrl('John');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('color')).toBeNull();
  });

  it('overrides default background when option is provided', () => {
    const url = avatarUrl('John', { background: '0D8ABC' });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('background')).toBe('0D8ABC');
  });

  it('includes custom color when provided', () => {
    const url = avatarUrl('John', { background: '000000', color: 'ffffff' });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('color')).toBe('ffffff');
    expect(parsed.searchParams.get('background')).toBe('000000');
  });

  it('accepts color alone and keeps background default', () => {
    const url = avatarUrl('John', { color: 'ffffff' });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('color')).toBe('ffffff');
    expect(parsed.searchParams.get('background')).toBe('random');
  });

  it('handles special characters in names', () => {
    const url = avatarUrl('Māori Manager');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('name')).toBe('Māori Manager');
  });

  it('handles empty name (caller responsibility to validate)', () => {
    const url = avatarUrl('');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('name')).toBe('');
  });
});
