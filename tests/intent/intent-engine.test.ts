import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { LlmAdapter } from '../../src/intent/adapter.ts';
import { IntentEngine } from '../../src/intent/intent-engine.ts';
import type { AgentSession } from '../../src/scanner/types.ts';

const FIXTURES = join(import.meta.dir, 'fixtures');
const CACHE_PATH = '/tmp/wwi-intent-cache.json';

function makeMockAdapter(response: string | undefined = '測試意圖摘要'): LlmAdapter {
  return {
    generateIntent: async () => response,
  };
}

function makeSession(id: string, sessionPath?: string): AgentSession {
  return {
    agentType: 'claude',
    sessionPath: sessionPath ?? join(FIXTURES, 'claude-session.jsonl'),
    sessionId: id,
    fullSessionId: `${id}-0000-0000-0000-000000000000`,
    projectName: 'test-project',
    projectPath: '/test/path',
    mtime: new Date(),
    activityLevel: 'active',
  };
}

describe('IntentEngine', () => {
  let engine: IntentEngine;
  const tempFiles: string[] = [];

  async function writeTempJsonl(content: string, name?: string): Promise<string> {
    const path = join(tmpdir(), name ?? `wwi-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jsonl`);
    await Bun.write(path, content);
    tempFiles.push(path);
    return path;
  }

  beforeEach(async () => {
    engine = undefined!;
    try {
      await unlink(CACHE_PATH);
    } catch {}
  });

  afterEach(async () => {
    if (engine) await engine.destroy();
    try {
      await unlink(CACHE_PATH);
    } catch {}
    for (const f of tempFiles) {
      try {
        await unlink(f);
      } catch {}
    }
    tempFiles.length = 0;
  });

  test('isAvailable returns true when adapter is provided', () => {
    engine = new IntentEngine({ adapter: makeMockAdapter() });
    expect(engine.isAvailable).toBe(true);
  });

  test('isAvailable returns false when adapter is null', () => {
    engine = new IntentEngine({ adapter: null });
    expect(engine.isAvailable).toBe(false);
  });

  test('requestIntentSync returns intent from adapter', async () => {
    engine = new IntentEngine({ adapter: makeMockAdapter('正在修復登入錯誤') });
    const intent = await engine.requestIntentSync(makeSession('abc1234'));
    expect(intent).toBe('正在修復登入錯誤');
  });

  test('requestIntentSync caches results', async () => {
    let callCount = 0;
    const adapter: LlmAdapter = {
      generateIntent: async () => {
        callCount++;
        return '快取測試';
      },
    };
    engine = new IntentEngine({ adapter });

    const session = makeSession('cache01');
    await engine.requestIntentSync(session);
    await engine.requestIntentSync(session);

    expect(callCount).toBe(1);
  });

  test('requestIntentSync falls back to last user message when adapter is null', async () => {
    engine = new IntentEngine({ adapter: null });
    const intent = await engine.requestIntentSync(makeSession('fallbk1'));
    expect(intent).toBe('also check the auth middleware');
  });

  test('getIntent returns cached intent', async () => {
    engine = new IntentEngine({ adapter: makeMockAdapter('已快取') });
    const session = makeSession('cached1');
    await engine.requestIntentSync(session);
    expect(engine.getIntent(session.sessionPath)).toBe('已快取');
  });

  test('getIntent returns undefined for uncached session', () => {
    engine = new IntentEngine({ adapter: makeMockAdapter() });
    expect(engine.getIntent('/nonexistent/path')).toBeUndefined();
  });

  test('rate limits API calls per session', async () => {
    let callCount = 0;
    const adapter: LlmAdapter = {
      generateIntent: async () => {
        callCount++;
        return `intent-${callCount}`;
      },
    };
    engine = new IntentEngine({ adapter });

    const tempPath = await writeTempJsonl('');

    for (let i = 0; i < 5; i++) {
      await Bun.write(tempPath, `{"type":"user","message":{"content":"message ${i}"}}\n`);
      await engine.requestIntentSync(makeSession('ratelm1', tempPath));
    }

    expect(callCount).toBe(2);
  });

  test('rate limited calls return previous cached intent', async () => {
    let callCount = 0;
    const adapter: LlmAdapter = {
      generateIntent: async () => {
        callCount++;
        return '第一次回應';
      },
    };
    engine = new IntentEngine({ adapter });

    const tempPath = await writeTempJsonl('{"type":"user","message":{"content":"first"}}\n');

    const result1 = await engine.requestIntentSync(makeSession('rlfb01', tempPath));
    expect(result1).toBe('第一次回應');

    await Bun.write(tempPath, '{"type":"user","message":{"content":"second"}}\n');
    await engine.requestIntentSync(makeSession('rlfb01', tempPath));

    await Bun.write(tempPath, '{"type":"user","message":{"content":"third"}}\n');
    const result3 = await engine.requestIntentSync(makeSession('rlfb01', tempPath));
    expect(result3).toBe('第一次回應');
    expect(callCount).toBe(2);
  });

  test('pruneStaleEntries removes entries not in active set', async () => {
    engine = new IntentEngine({ adapter: makeMockAdapter('pruning') });

    const session1 = makeSession('prune01');
    await engine.requestIntentSync(session1);

    const stalePath = await writeTempJsonl('{"type":"user","message":{"content":"stale"}}\n');
    const session2 = makeSession('prune02', stalePath);
    await engine.requestIntentSync(session2);

    engine.pruneStaleEntries(new Set([session1.sessionPath]));

    expect(engine.getIntent(session1.sessionPath)).toBe('pruning');
    expect(engine.getIntent(session2.sessionPath)).toBeUndefined();
  });

  test('destroy clears timers without errors', async () => {
    engine = new IntentEngine({ adapter: makeMockAdapter() });
    await engine.init();
    await engine.destroy();
  });

  test('requestIntentSync cleans newlines from response', async () => {
    engine = new IntentEngine({ adapter: makeMockAdapter('第一行\n第二行') });
    const intent = await engine.requestIntentSync(makeSession('newln01'));
    expect(intent).toBe('第一行 第二行');
  });
});
