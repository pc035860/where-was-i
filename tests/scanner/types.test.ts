import { describe, expect, test } from 'bun:test';
import {
  ACTIVE_THRESHOLD_MS,
  AGENT_DISPLAY_NAMES,
  computeActivityLevel,
  RECENT_THRESHOLD_MS,
  SESSION_ID_LENGTH,
} from '../../src/scanner/types.ts';

describe('computeActivityLevel', () => {
  test('returns active for mtime within active threshold', () => {
    expect(computeActivityLevel(new Date())).toBe('active');
    expect(computeActivityLevel(new Date(Date.now() - ACTIVE_THRESHOLD_MS + 60_000))).toBe('active');
    expect(computeActivityLevel(new Date(Date.now() - ACTIVE_THRESHOLD_MS + 1_000))).toBe('active');
  });

  test('returns recent for mtime between active and recent thresholds', () => {
    expect(computeActivityLevel(new Date(Date.now() - ACTIVE_THRESHOLD_MS - 1_000))).toBe('recent');
    expect(computeActivityLevel(new Date(Date.now() - RECENT_THRESHOLD_MS + 60_000))).toBe('recent');
    expect(computeActivityLevel(new Date(Date.now() - RECENT_THRESHOLD_MS + 1_000))).toBe('recent');
  });

  test('returns stale for mtime beyond recent threshold', () => {
    expect(computeActivityLevel(new Date(Date.now() - RECENT_THRESHOLD_MS - 1_000))).toBe('stale');
    expect(computeActivityLevel(new Date(Date.now() - 24 * 60 * 60_000))).toBe('stale');
  });
});

describe('constants', () => {
  test('SESSION_ID_LENGTH is 7', () => {
    expect(SESSION_ID_LENGTH).toBe(7);
  });

  test('AGENT_DISPLAY_NAMES covers all agent types', () => {
    expect(AGENT_DISPLAY_NAMES.claude).toBe('claude');
    expect(AGENT_DISPLAY_NAMES.codex).toBe('codex');
    expect(AGENT_DISPLAY_NAMES.gemini).toBe('gemini');
  });
});
