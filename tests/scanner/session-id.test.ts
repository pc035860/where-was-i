import { describe, expect, test } from 'bun:test';
import { deriveShortId, extractFullSessionId } from '../../src/scanner/session-scanner.ts';
import { SESSION_ID_LENGTH } from '../../src/scanner/types.ts';

describe('extractFullSessionId', () => {
  test('claude: returns full UUID from filename', () => {
    const result = extractFullSessionId('claude', '/path/to/abc12345-1234-1234-1234-123456789abc.jsonl');
    expect(result).toBe('abc12345-1234-1234-1234-123456789abc');
  });

  test('codex: returns full UUID without rollout- prefix', () => {
    const result = extractFullSessionId('codex', '/path/to/rollout-01969eaf-1234-7abc-9def-123456789abc.jsonl');
    expect(result).toBe('01969eaf-1234-7abc-9def-123456789abc');
  });

  test('gemini: returns full session stem without .json', () => {
    const result = extractFullSessionId('gemini', '/path/to/session-1234abcd-5678-efab-9012-ijkl34567890.json');
    expect(result).toBe('session-1234abcd-5678-efab-9012-ijkl34567890');
  });
});

describe('deriveShortId', () => {
  test('claude: takes first SESSION_ID_LENGTH chars', () => {
    const result = deriveShortId('claude', 'abc12345-1234-1234-1234-123456789abc');
    expect(result).toBe('abc1234');
    expect(result).toHaveLength(SESSION_ID_LENGTH);
  });

  test('codex: takes first SESSION_ID_LENGTH chars of last dash segment', () => {
    const result = deriveShortId('codex', '01969eaf-1234-7abc-9def-123456789abc');
    expect(result).toBe('1234567');
    expect(result).toHaveLength(SESSION_ID_LENGTH);
  });

  test('gemini: takes first SESSION_ID_LENGTH chars of last dash segment', () => {
    const result = deriveShortId('gemini', 'session-1234abcd-5678-efab-9012-ijkl34567890');
    expect(result).toBe('ijkl345');
    expect(result).toHaveLength(SESSION_ID_LENGTH);
  });

  test('codex fallback: no dashes uses first SESSION_ID_LENGTH chars', () => {
    const result = deriveShortId('codex', 'abcdef1234567890');
    expect(result).toBe('abcdef1');
    expect(result).toHaveLength(SESSION_ID_LENGTH);
  });

  test('gemini fallback: no dashes uses first SESSION_ID_LENGTH chars', () => {
    const result = deriveShortId('gemini', 'nodashvalue1234');
    expect(result).toBe('nodashv');
    expect(result).toHaveLength(SESSION_ID_LENGTH);
  });
});
