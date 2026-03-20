import { describe, expect, test } from 'bun:test';
import type { AgentSession } from '../../src/scanner/types.ts';
import { buildResumeCommand } from '../../src/tui/resume-command.ts';

function makeSession(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    agentType: 'claude',
    sessionPath: '/home/user/.claude/projects/test/abc12345-1234-1234-1234-123456789abc.jsonl',
    sessionId: 'abc1234',
    projectName: 'test-project',
    projectPath: '/home/user/code/test-project',
    mtime: new Date(),
    activityLevel: 'active',
    ...overrides,
  };
}

describe('buildResumeCommand', () => {
  test('returns claude -r {uuid} for claude sessions', () => {
    const session = makeSession({
      agentType: 'claude',
      sessionPath: '/home/.claude/projects/test/a1b2c3d4-5678-9abc-def0-123456789abc.jsonl',
    });
    expect(buildResumeCommand(session)).toBe('claude -r a1b2c3d4-5678-9abc-def0-123456789abc');
  });

  test('strips .jsonl extension from claude session path', () => {
    const session = makeSession({
      agentType: 'claude',
      sessionPath: '/deep/nested/path/my-uuid.jsonl',
    });
    expect(buildResumeCommand(session)).toBe('claude -r my-uuid');
  });

  test('returns sessionId for codex sessions', () => {
    const session = makeSession({
      agentType: 'codex',
      sessionId: 'xyz7890',
      sessionPath: '/home/.codex/sessions/rollout-abc-xyz7890def.jsonl',
    });
    expect(buildResumeCommand(session)).toBe('xyz7890');
  });

  test('returns sessionId for gemini sessions', () => {
    const session = makeSession({
      agentType: 'gemini',
      sessionId: 'gem1234',
      sessionPath: '/home/.gemini/tmp/123/chats/session-gem1234abc.json',
    });
    expect(buildResumeCommand(session)).toBe('gem1234');
  });
});
