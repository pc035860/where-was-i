export type AgentType = 'claude' | 'codex' | 'gemini';

export type ActivityLevel = 'active' | 'recent' | 'stale';

export interface AgentSession {
  agentType: AgentType;
  sessionPath: string;
  sessionId: string;
  projectName: string;
  projectPath: string;
  mtime: Date;
  activityLevel: ActivityLevel;
  intent?: string;
}

export interface ConversationContext {
  userMessages: string[];
  assistantMessages: string[];
  recentTools: string[];
  projectName: string;
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;
const RECENT_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export function computeActivityLevel(mtime: Date): ActivityLevel {
  const age = Date.now() - mtime.getTime();
  if (age < ACTIVE_THRESHOLD_MS) return 'active';
  if (age < RECENT_THRESHOLD_MS) return 'recent';
  return 'stale';
}

export const SESSION_ID_LENGTH = 7;

export const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  claude: 'claude',
  codex: 'codex',
  gemini: 'gemini',
};
