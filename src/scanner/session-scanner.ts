import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { Glob } from 'bun';
import type { AgentSession, AgentType } from './types.ts';
import { computeActivityLevel } from './types.ts';
import {
  extractCwdFromClaudeSession,
  extractCwdFromCodexSession,
  extractProjectFromGeminiSession,
} from './project-name.ts';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface RawSession {
  path: string;
  mtime: Date;
  agentType: AgentType;
  groupKey: string;
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

      const encodedPath = file
        .replace(baseDir + '/', '')
        .split('/')
        .slice(0, -1)
        .join('/');

      const cwd = await extractCwdFromClaudeSession(file);
      const projectName = cwd ? basename(cwd) : encodedPath;
      const projectPath = cwd || encodedPath;

      sessions.push({
        path: file,
        mtime: stats.mtime,
        agentType: 'claude',
        groupKey: `claude:${encodedPath}`,
        projectName,
        projectPath,
      });
    } catch {
      continue;
    }
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

      const cwd = await extractCwdFromCodexSession(file);
      if (!cwd) continue;

      const projectName = basename(cwd);

      sessions.push({
        path: file,
        mtime: stats.mtime,
        agentType: 'codex',
        groupKey: `codex:${cwd}`,
        projectName,
        projectPath: cwd,
      });
    } catch {
      continue;
    }
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

      const info = await extractProjectFromGeminiSession(file);
      if (!info) continue;

      const projectName = basename(info.displayName);

      sessions.push({
        path: file,
        mtime: stats.mtime,
        agentType: 'gemini',
        groupKey: `gemini:${info.projectDir}`,
        projectName,
        projectPath: info.displayName,
      });
    } catch {
      continue;
    }
  }

  return sessions;
}

function pickLatestPerGroup(sessions: RawSession[]): RawSession[] {
  const groups = new Map<string, RawSession>();

  for (const session of sessions) {
    const existing = groups.get(session.groupKey);
    if (!existing || session.mtime.getTime() > existing.mtime.getTime()) {
      groups.set(session.groupKey, session);
    }
  }

  return Array.from(groups.values());
}

export async function scanAllSessions(): Promise<AgentSession[]> {
  const [claudeSessions, codexSessions, geminiSessions] = await Promise.all([
    scanClaudeSessions(),
    scanCodexSessions(),
    scanGeminiSessions(),
  ]);

  const allRaw = [...claudeSessions, ...codexSessions, ...geminiSessions];
  const latest = pickLatestPerGroup(allRaw);

  const sessions: AgentSession[] = latest.map((raw) => ({
    agentType: raw.agentType,
    sessionPath: raw.path,
    projectName: raw.projectName,
    projectPath: raw.projectPath,
    mtime: raw.mtime,
    activityLevel: computeActivityLevel(raw.mtime),
  }));

  sessions.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return sessions;
}
