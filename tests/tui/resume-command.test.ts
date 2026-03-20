import { describe, expect, test } from 'bun:test';
import type { AgentSession } from '../../src/scanner/types.ts';
import { buildResumeCommand } from '../../src/tui/resume-command.ts';

function makeSession(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    agentType: 'claude',
    sessionPath: '/home/user/.claude/projects/test/abc12345-1234-1234-1234-123456789abc.jsonl',
    sessionId: 'abc1234',
    fullSessionId: 'abc12345-1234-1234-1234-123456789abc',
    projectName: 'test-project',
    projectPath: '/home/user/code/test-project',
    mtime: new Date(),
    activityLevel: 'active',
    ...overrides,
  };
}

describe('buildResumeCommand', () => {
  test('returns fullSessionId for claude sessions', () => {
    const session = makeSession({
      agentType: 'claude',
      fullSessionId: 'abc12345-1234-1234-1234-123456789abc',
    });
    expect(buildResumeCommand(session)).toBe('abc12345-1234-1234-1234-123456789abc');
  });

  test('returns fullSessionId for codex sessions', () => {
    const session = makeSession({
      agentType: 'codex',
      fullSessionId: '01969eaf-1234-7abc-9def-123456789abc',
    });
    expect(buildResumeCommand(session)).toBe('01969eaf-1234-7abc-9def-123456789abc');
  });

  test('returns fullSessionId for gemini sessions', () => {
    const session = makeSession({
      agentType: 'gemini',
      fullSessionId: 'session-1234abcd-5678-efab-9012-ijkl34567890',
    });
    expect(buildResumeCommand(session)).toBe('session-1234abcd-5678-efab-9012-ijkl34567890');
  });
});
