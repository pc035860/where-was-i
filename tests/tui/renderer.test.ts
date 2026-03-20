import { describe, expect, test } from 'bun:test';
import type { AgentSession } from '../../src/scanner/types.ts';
import { renderStatus } from '../../src/tui/renderer.ts';

function makeSession(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    agentType: 'claude',
    sessionPath: '/home/user/.claude/projects/test/abc12345-1234-1234-1234-123456789abc.jsonl',
    sessionId: 'abc1234',
    projectName: 'test-project',
    projectPath: '/home/user/code/test-project',
    mtime: new Date(),
    activityLevel: 'active',
    intent: 'Working on tests',
    ...overrides,
  };
}

describe('renderStatus', () => {
  test('returns RenderResult with output and displayed', () => {
    const sessions = [makeSession()];
    const result = renderStatus(sessions, { showStale: false });
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('displayed');
    expect(typeof result.output).toBe('string');
    expect(Array.isArray(result.displayed)).toBe(true);
  });

  test('displayed contains visible sessions in order', () => {
    const s1 = makeSession({ sessionId: 'aaa1111', activityLevel: 'active' });
    const s2 = makeSession({ sessionId: 'bbb2222', activityLevel: 'recent' });
    const result = renderStatus([s1, s2], { showStale: false, showAll: true });
    expect(result.displayed).toHaveLength(2);
    expect(result.displayed[0]!.sessionId).toBe('aaa1111');
    expect(result.displayed[1]!.sessionId).toBe('bbb2222');
  });

  test('displayed is empty when no sessions', () => {
    const result = renderStatus([], { showStale: false });
    expect(result.displayed).toHaveLength(0);
    expect(result.output).toContain('No active agent sessions');
  });

  test('stale sessions not in displayed when showStale is false', () => {
    const s1 = makeSession({ sessionId: 'aaa1111', activityLevel: 'active' });
    const s2 = makeSession({ sessionId: 'bbb2222', activityLevel: 'stale' });
    const result = renderStatus([s1, s2], { showStale: false, showAll: true });
    expect(result.displayed).toHaveLength(1);
    expect(result.displayed[0]!.sessionId).toBe('aaa1111');
  });

  test('stale sessions included in displayed when showStale is true', () => {
    const s1 = makeSession({ sessionId: 'aaa1111', activityLevel: 'active' });
    const s2 = makeSession({ sessionId: 'bbb2222', activityLevel: 'stale' });
    const result = renderStatus([s1, s2], { showStale: true, showAll: true });
    expect(result.displayed).toHaveLength(2);
  });

  test('output contains session index numbers before status icon', () => {
    const s1 = makeSession({ sessionId: 'aaa1111' });
    const s2 = makeSession({ sessionId: 'bbb2222', activityLevel: 'recent' });
    const result = renderStatus([s1, s2], { showStale: false, showAll: true });
    const stripped = Bun.stripANSI(result.output);
    expect(stripped).toMatch(/1\s+●/);
    expect(stripped).toMatch(/2\s+●/);
  });

  test('statusMessage is rendered when provided', () => {
    const sessions = [makeSession()];
    const result = renderStatus(sessions, { showStale: false, statusMessage: 'Copied: claude -r abc123' });
    const stripped = Bun.stripANSI(result.output);
    expect(stripped).toContain('Copied: claude -r abc123');
  });

  test('no statusMessage line when not provided', () => {
    const sessions = [makeSession()];
    const result = renderStatus(sessions, { showStale: false });
    const stripped = Bun.stripANSI(result.output);
    expect(stripped).not.toContain('Copied');
  });
});
