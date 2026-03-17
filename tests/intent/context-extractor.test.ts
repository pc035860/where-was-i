import { afterEach, describe, expect, test } from 'bun:test';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractContext } from '../../src/intent/context-extractor.ts';
import type { AgentSession } from '../../src/scanner/types.ts';

const FIXTURES = join(import.meta.dir, 'fixtures');

function makeSession(agentType: 'claude' | 'codex' | 'gemini', sessionPath: string): AgentSession {
  return {
    agentType,
    sessionPath,
    sessionId: 'test123',
    projectName: 'test-project',
    projectPath: '/test/path',
    mtime: new Date(),
    activityLevel: 'active',
  };
}

function fixtureSession(agentType: 'claude' | 'codex' | 'gemini', filename: string): AgentSession {
  return makeSession(agentType, join(FIXTURES, filename));
}

describe('extractContext — Claude', () => {
  test('extracts user messages from Claude JSONL', async () => {
    const ctx = await extractContext(fixtureSession('claude', 'claude-session.jsonl'));
    expect(ctx.userMessages).toContain('help me fix the login bug');
    expect(ctx.userMessages).toContain('also check the auth middleware');
  });

  test('extracts assistant messages from Claude JSONL', async () => {
    const ctx = await extractContext(fixtureSession('claude', 'claude-session.jsonl'));
    expect(ctx.assistantMessages.length).toBeGreaterThan(0);
    expect(ctx.assistantMessages.some((m) => m.includes('login issue'))).toBe(true);
  });

  test('extracts tools from Claude JSONL', async () => {
    const ctx = await extractContext(fixtureSession('claude', 'claude-session.jsonl'));
    expect(ctx.recentTools).toContain('Read');
    expect(ctx.recentTools).toContain('Edit');
  });

  test('sets projectName from session', async () => {
    const ctx = await extractContext(fixtureSession('claude', 'claude-session.jsonl'));
    expect(ctx.projectName).toBe('test-project');
  });

  test('filters out system tag messages', async () => {
    const ctx = await extractContext(fixtureSession('claude', 'claude-session.jsonl'));
    const hasSystemTag = ctx.userMessages.some((m) => m.startsWith('<system-reminder'));
    expect(hasSystemTag).toBe(false);
  });
});

describe('extractContext — Codex', () => {
  test('extracts user messages from Codex JSONL (string content)', async () => {
    const ctx = await extractContext(fixtureSession('codex', 'codex-session.jsonl'));
    expect(ctx.userMessages).toContain('refactor the API handler');
    expect(ctx.userMessages).toContain('now add error handling');
  });

  test('extracts assistant messages from Codex JSONL (string content)', async () => {
    const ctx = await extractContext(fixtureSession('codex', 'codex-session.jsonl'));
    expect(ctx.assistantMessages.length).toBeGreaterThan(0);
  });

  test('extracts tools from Codex JSONL', async () => {
    const ctx = await extractContext(fixtureSession('codex', 'codex-session.jsonl'));
    expect(ctx.recentTools).toContain('shell');
  });

  test('extracts user messages from Codex v2 format (input_text)', async () => {
    const ctx = await extractContext(fixtureSession('codex', 'codex-session-v2.jsonl'));
    expect(ctx.userMessages).toContain('review the auth module');
    expect(ctx.userMessages).toContain('fix it and add tests');
  });

  test('extracts assistant messages from Codex v2 format (output_text)', async () => {
    const ctx = await extractContext(fixtureSession('codex', 'codex-session-v2.jsonl'));
    expect(ctx.assistantMessages).toContain("I'll review the auth module now.");
    expect(ctx.assistantMessages).toContain('Found a missing null check in the token validation.');
  });

  test('extracts tools from Codex v2 format', async () => {
    const ctx = await extractContext(fixtureSession('codex', 'codex-session-v2.jsonl'));
    expect(ctx.recentTools).toContain('exec_command');
  });

  test('skips developer role messages in Codex v2', async () => {
    const ctx = await extractContext(fixtureSession('codex', 'codex-session-v2.jsonl'));
    const hasDeveloper = ctx.userMessages.some((m) => m.includes('You are a coding assistant'));
    expect(hasDeveloper).toBe(false);
  });
});

describe('extractContext — Gemini', () => {
  test('extracts user messages from Gemini JSON', async () => {
    const ctx = await extractContext(fixtureSession('gemini', 'gemini-session.json'));
    expect(ctx.userMessages).toContain('create a new React component');
    expect(ctx.userMessages).toContain('add unit tests for it');
  });

  test('extracts assistant messages from Gemini JSON', async () => {
    const ctx = await extractContext(fixtureSession('gemini', 'gemini-session.json'));
    expect(ctx.assistantMessages.length).toBeGreaterThan(0);
    expect(ctx.assistantMessages.some((m) => m.includes('component'))).toBe(true);
  });

  test('extracts tools from Gemini JSON', async () => {
    const ctx = await extractContext(fixtureSession('gemini', 'gemini-session.json'));
    expect(ctx.recentTools).toContain('writeFile');
    expect(ctx.recentTools).toContain('readFile');
  });
});

describe('extractContext — limits', () => {
  test('caps user messages to 5', async () => {
    const ctx = await extractContext(fixtureSession('claude', 'claude-session.jsonl'));
    expect(ctx.userMessages.length).toBeLessThanOrEqual(5);
  });

  test('caps assistant messages to 5', async () => {
    const ctx = await extractContext(fixtureSession('claude', 'claude-session.jsonl'));
    expect(ctx.assistantMessages.length).toBeLessThanOrEqual(5);
  });

  test('caps tools to 5', async () => {
    const ctx = await extractContext(fixtureSession('claude', 'claude-session.jsonl'));
    expect(ctx.recentTools.length).toBeLessThanOrEqual(5);
  });
});

describe('extractContext — error handling', () => {
  const tempFiles: string[] = [];

  afterEach(async () => {
    for (const f of tempFiles) {
      try {
        await unlink(f);
      } catch {}
    }
    tempFiles.length = 0;
  });

  test('returns empty context for empty JSONL file', async () => {
    const path = join(tmpdir(), `wwi-test-empty-${Date.now()}.jsonl`);
    tempFiles.push(path);
    await Bun.write(path, '');

    const ctx = await extractContext(makeSession('claude', path));
    expect(ctx.userMessages).toEqual([]);
    expect(ctx.assistantMessages).toEqual([]);
    expect(ctx.recentTools).toEqual([]);
  });

  test('skips malformed JSON lines in JSONL', async () => {
    const path = join(tmpdir(), `wwi-test-malformed-${Date.now()}.jsonl`);
    tempFiles.push(path);
    await Bun.write(path, 'not json\n{"type":"user","message":{"content":"valid msg"}}\n{broken\n');

    const ctx = await extractContext(makeSession('claude', path));
    expect(ctx.userMessages).toContain('valid msg');
    expect(ctx.userMessages.length).toBe(1);
  });

  test('returns empty context for malformed Gemini JSON', async () => {
    const path = join(tmpdir(), `wwi-test-bad-gemini-${Date.now()}.json`);
    tempFiles.push(path);
    await Bun.write(path, '{invalid json}}}');

    const ctx = await extractContext(makeSession('gemini', path));
    expect(ctx.userMessages).toEqual([]);
    expect(ctx.assistantMessages).toEqual([]);
  });

  test('handles Gemini JSON with missing messages array', async () => {
    const path = join(tmpdir(), `wwi-test-no-msgs-${Date.now()}.json`);
    tempFiles.push(path);
    await Bun.write(path, '{"version": 1}');

    const ctx = await extractContext(makeSession('gemini', path));
    expect(ctx.userMessages).toEqual([]);
    expect(ctx.assistantMessages).toEqual([]);
  });

  test('handles JSONL with missing content fields', async () => {
    const path = join(tmpdir(), `wwi-test-no-content-${Date.now()}.jsonl`);
    tempFiles.push(path);
    await Bun.write(path, '{"type":"user"}\n{"type":"assistant"}\n');

    const ctx = await extractContext(makeSession('claude', path));
    expect(ctx.userMessages).toEqual([]);
    expect(ctx.assistantMessages).toEqual([]);
  });
});
