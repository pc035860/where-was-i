import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  extractClaudeTimestamp,
  extractCodexTimestamp,
  extractGeminiTimestamp,
} from '../../src/scanner/content-timestamp.ts';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'wwi-ts-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('extractClaudeTimestamp', () => {
  test('returns last timestamp from JSONL', async () => {
    const filePath = join(tempDir, 'session.jsonl');
    const lines = [
      JSON.stringify({ type: 'user', timestamp: '2026-03-10T10:00:00.000Z' }),
      JSON.stringify({ type: 'assistant', timestamp: '2026-03-10T10:01:00.000Z' }),
      JSON.stringify({ type: 'system', timestamp: '2026-03-10T10:02:00.000Z' }),
    ];
    await Bun.write(filePath, `${lines.join('\n')}\n`);

    const result = await extractClaudeTimestamp(filePath);
    expect(result).toEqual(new Date('2026-03-10T10:02:00.000Z'));
  });

  test('skips entries without timestamp', async () => {
    const filePath = join(tempDir, 'session.jsonl');
    const lines = [
      JSON.stringify({ type: 'assistant', timestamp: '2026-03-10T10:01:00.000Z' }),
      JSON.stringify({ type: 'last-prompt', lastPrompt: '/commit' }),
    ];
    await Bun.write(filePath, `${lines.join('\n')}\n`);

    const result = await extractClaudeTimestamp(filePath);
    expect(result).toEqual(new Date('2026-03-10T10:01:00.000Z'));
  });

  test('returns null for JSONL without any timestamp', async () => {
    const filePath = join(tempDir, 'session.jsonl');
    const lines = [JSON.stringify({ type: 'last-prompt', lastPrompt: '/commit' })];
    await Bun.write(filePath, `${lines.join('\n')}\n`);

    const result = await extractClaudeTimestamp(filePath);
    expect(result).toBeNull();
  });

  test('returns null for empty file', async () => {
    const filePath = join(tempDir, 'empty.jsonl');
    await Bun.write(filePath, '');

    const result = await extractClaudeTimestamp(filePath);
    expect(result).toBeNull();
  });

  test('returns null for nonexistent file', async () => {
    const result = await extractClaudeTimestamp(join(tempDir, 'nope.jsonl'));
    expect(result).toBeNull();
  });
});

describe('extractCodexTimestamp', () => {
  test('returns last timestamp from Codex JSONL', async () => {
    const filePath = join(tempDir, 'rollout.jsonl');
    const lines = [
      JSON.stringify({ timestamp: '2026-03-13T11:00:00.000Z', type: 'session_meta', payload: {} }),
      JSON.stringify({ timestamp: '2026-03-13T12:00:00.000Z', type: 'event', payload: {} }),
      JSON.stringify({ timestamp: '2026-03-13T12:02:03.444Z', type: 'event', payload: {} }),
    ];
    await Bun.write(filePath, `${lines.join('\n')}\n`);

    const result = await extractCodexTimestamp(filePath);
    expect(result).toEqual(new Date('2026-03-13T12:02:03.444Z'));
  });
});

describe('extractGeminiTimestamp', () => {
  test('returns lastUpdated from Gemini JSON', async () => {
    const filePath = join(tempDir, 'session.json');
    const data = {
      sessionId: 'test',
      lastUpdated: '2026-02-21T19:05:09.527Z',
      messages: [],
    };
    await Bun.write(filePath, JSON.stringify(data));

    const result = await extractGeminiTimestamp(filePath);
    expect(result).toEqual(new Date('2026-02-21T19:05:09.527Z'));
  });

  test('returns null when lastUpdated is missing', async () => {
    const filePath = join(tempDir, 'session.json');
    await Bun.write(filePath, JSON.stringify({ sessionId: 'test', messages: [] }));

    const result = await extractGeminiTimestamp(filePath);
    expect(result).toBeNull();
  });

  test('returns null for invalid JSON', async () => {
    const filePath = join(tempDir, 'broken.json');
    await Bun.write(filePath, 'not json');

    const result = await extractGeminiTimestamp(filePath);
    expect(result).toBeNull();
  });
});
