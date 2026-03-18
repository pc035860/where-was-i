import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { Glob } from 'bun';
import { extractClaudeTimestamp, extractCodexTimestamp, extractGeminiTimestamp } from './content-timestamp.ts';
import {
  extractCwdFromClaudeSession,
  extractCwdFromCodexSession,
  extractProjectFromGeminiSession,
} from './project-name.ts';
import type { AgentSession, AgentType } from './types.ts';
import { computeActivityLevel, SESSION_ID_LENGTH } from './types.ts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function extractSessionId(agentType: AgentType, filePath: string): string {
  const filename = basename(filePath);
  switch (agentType) {
    case 'claude':
      return filename.replace('.jsonl', '').slice(0, SESSION_ID_LENGTH);
    case 'codex': {
      const stem = filename.replace('rollout-', '').replace('.jsonl', '');
      const lastDash = stem.lastIndexOf('-');
      return lastDash >= 0
        ? stem.slice(lastDash + 1, lastDash + 1 + SESSION_ID_LENGTH)
        : stem.slice(0, SESSION_ID_LENGTH);
    }
    case 'gemini': {
      const stem = filename.replace('.json', '');
      const lastDash = stem.lastIndexOf('-');
      return lastDash >= 0
        ? stem.slice(lastDash + 1, lastDash + 1 + SESSION_ID_LENGTH)
        : stem.slice(0, SESSION_ID_LENGTH);
    }
  }
}

interface RawSession {
  path: string;
  mtime: Date;
  agentType: AgentType;
  sessionId: string;
  projectName: string;
  projectPath: string;
}

async function scanClaudeSessions(): Promise<RawSession[]> {
  const baseDir = join(homedir(), '.claude', 'projects');

  try {
    await stat(baseDir);
  } catch {
    return [];
  }

  const glob = new Glob('**/*.jsonl');
  const sessions: RawSession[] = [];
  const now = Date.now();

  for await (const file of glob.scan({ cwd: baseDir, absolute: true })) {
    const filename = file.split('/').pop() || '';
    if (filename.startsWith('agent-')) continue;
    if (!UUID_PATTERN.test(filename)) continue;

    try {
      const stats = await stat(file);
      if (now - stats.mtime.getTime() > MAX_AGE_MS) continue;

      const encodedPath = file.replace(`${baseDir}/`, '').split('/').slice(0, -1).join('/');

      const [cwd, contentTimestamp] = await Promise.all([
        extractCwdFromClaudeSession(file),
        extractClaudeTimestamp(file),
      ]);
      const projectName = cwd ? basename(cwd) : encodedPath;
      const projectPath = cwd || encodedPath;

      sessions.push({
        path: file,
        mtime: contentTimestamp ?? stats.mtime,
        agentType: 'claude',
        sessionId: extractSessionId('claude', file),
        projectName,
        projectPath,
      });
    } catch {}
  }

  return sessions;
}

async function scanCodexSessions(): Promise<RawSession[]> {
  const baseDir = join(homedir(), '.codex', 'sessions');
  const sessions: RawSession[] = [];
  const now = Date.now();

  try {
    await stat(baseDir);
  } catch {
    return [];
  }

  const glob = new Glob('**/*.jsonl');
  for await (const file of glob.scan({ cwd: baseDir, absolute: true })) {
    const filename = basename(file);
    if (!filename.startsWith('rollout-')) continue;

    try {
      const stats = await stat(file);
      if (now - stats.mtime.getTime() > MAX_AGE_MS) continue;

      const [cwd, contentTimestamp] = await Promise.all([
        extractCwdFromCodexSession(file),
        extractCodexTimestamp(file),
      ]);
      if (!cwd) continue;

      const projectName = basename(cwd);

      sessions.push({
        path: file,
        mtime: contentTimestamp ?? stats.mtime,
        agentType: 'codex',
        sessionId: extractSessionId('codex', file),
        projectName,
        projectPath: cwd,
      });
    } catch {}
  }

  return sessions;
}

async function scanGeminiSessions(): Promise<RawSession[]> {
  const baseDir = join(homedir(), '.gemini', 'tmp');
  const sessions: RawSession[] = [];
  const now = Date.now();

  try {
    await stat(baseDir);
  } catch {
    return [];
  }

  const glob = new Glob('*/chats/session-*.json');
  for await (const file of glob.scan({ cwd: baseDir, absolute: true })) {
    try {
      const stats = await stat(file);
      if (now - stats.mtime.getTime() > MAX_AGE_MS) continue;

      const [info, contentTimestamp] = await Promise.all([
        extractProjectFromGeminiSession(file),
        extractGeminiTimestamp(file),
      ]);
      if (!info) continue;

      const projectName = basename(info.displayName);

      sessions.push({
        path: file,
        mtime: contentTimestamp ?? stats.mtime,
        agentType: 'gemini',
        sessionId: extractSessionId('gemini', file),
        projectName,
        projectPath: info.displayName,
      });
    } catch {}
  }

  return sessions;
}

export async function scanAllSessions(): Promise<AgentSession[]> {
  const [claudeSessions, codexSessions, geminiSessions] = await Promise.all([
    scanClaudeSessions(),
    scanCodexSessions(),
    scanGeminiSessions(),
  ]);

  const allRaw = [...claudeSessions, ...codexSessions, ...geminiSessions];

  const sessions: AgentSession[] = allRaw.map((raw) => ({
    agentType: raw.agentType,
    sessionPath: raw.path,
    sessionId: raw.sessionId,
    projectName: raw.projectName,
    projectPath: raw.projectPath,
    mtime: raw.mtime,
    activityLevel: computeActivityLevel(raw.mtime),
  }));

  sessions.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return sessions;
}
