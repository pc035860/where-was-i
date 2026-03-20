import type { AgentSession } from '../scanner/types.ts';

export function buildResumeCommand(session: AgentSession): string {
  return session.fullSessionId;
}
