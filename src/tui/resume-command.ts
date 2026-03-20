import { basename } from 'node:path';
import type { AgentSession } from '../scanner/types.ts';

export function buildResumeCommand(session: AgentSession): string {
  if (session.agentType === 'claude') {
    const uuid = basename(session.sessionPath).replace('.jsonl', '');
    return `claude -r ${uuid}`;
  }
  return session.sessionId;
}
