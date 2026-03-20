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
  test('returns sessionId for claude sessions', () => {
    const session = makeSession({ agentType: 'claude', sessionId: 'abc1234' });
    expect(buildResumeCommand(session)).toBe('abc1234');
  });

  test('returns sessionId for codex sessions', () => {
    const session = makeSession({ agentType: 'codex', sessionId: 'xyz7890' });
    expect(buildResumeCommand(session)).toBe('xyz7890');
  });

  test('returns sessionId for gemini sessions', () => {
    const session = makeSession({ agentType: 'gemini', sessionId: 'gem1234' });
    expect(buildResumeCommand(session)).toBe('gem1234');
  });
});
