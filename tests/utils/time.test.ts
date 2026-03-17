import { describe, expect, test } from 'bun:test';
import { formatRelativeTime } from '../../src/utils/time.ts';

describe('formatRelativeTime', () => {
  test('returns <1m for dates less than 60 seconds ago', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('<1m');
    expect(formatRelativeTime(new Date(Date.now() - 30_000))).toBe('<1m');
    expect(formatRelativeTime(new Date(Date.now() - 59_000))).toBe('<1m');
  });

  test('returns minutes for dates 1-59 minutes ago', () => {
    expect(formatRelativeTime(new Date(Date.now() - 60_000))).toBe('1m');
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000))).toBe('5m');
    expect(formatRelativeTime(new Date(Date.now() - 59 * 60_000))).toBe('59m');
  });

  test('returns hours for dates 1-23 hours ago', () => {
    expect(formatRelativeTime(new Date(Date.now() - 60 * 60_000))).toBe('1h');
    expect(formatRelativeTime(new Date(Date.now() - 12 * 60 * 60_000))).toBe('12h');
    expect(formatRelativeTime(new Date(Date.now() - 23 * 60 * 60_000))).toBe('23h');
  });

  test('returns days for dates 1+ days ago', () => {
    expect(formatRelativeTime(new Date(Date.now() - 24 * 60 * 60_000))).toBe('1d');
    expect(formatRelativeTime(new Date(Date.now() - 7 * 24 * 60 * 60_000))).toBe('7d');
  });
});
