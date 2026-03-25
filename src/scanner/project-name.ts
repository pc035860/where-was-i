import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';

export async function extractCwdFromClaudeSession(filePath: string): Promise<string | null> {
  try {
    const file = Bun.file(filePath);
    const headBlob = file.slice(0, 10 * 1024);
    const text = await headBlob.text();

    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.cwd) return data.cwd;
        if (data.message?.cwd) return data.message.cwd;
      } catch {}
    }
    return null;
  } catch {
    return null;
  }
}

export async function extractCwdFromCodexSession(filePath: string): Promise<string | null> {
  try {
    const file = Bun.file(filePath);
    const headBlob = file.slice(0, 32 * 1024);
    const headText = await headBlob.text();
    const firstLine = headText.split('\n')[0];
    if (!firstLine) return null;

    const meta = JSON.parse(firstLine);
    if (meta.type !== 'session_meta') return null;

    const payload = meta.payload as { cwd?: string; source?: unknown } | undefined;
    if (!payload?.cwd) return null;

    const source = payload.source;
    if (typeof source === 'object' && source !== null && 'subagent' in source) {
      return null;
    }

    return payload.cwd;
  } catch {
    return null;
  }
}

export async function extractProjectFromGeminiSession(
  sessionPath: string,
): Promise<{ projectDir: string; displayName: string } | null> {
  const chatsDir = dirname(sessionPath);
  const projectDir = dirname(chatsDir);

  const projectRootPath = join(projectDir, '.project_root');
  const projectRootFile = Bun.file(projectRootPath);

  if (await projectRootFile.exists()) {
    try {
      const cwd = (await projectRootFile.text()).trim();
      return { projectDir, displayName: cwd };
    } catch {
      // fall through
    }
  }

  const dirName = basename(projectDir);
  return { projectDir, displayName: dirName };
}

async function isDir(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export async function resolveSegments(segments: string[], base: string): Promise<string> {
  if (segments.length === 0) return base;

  let current = base;
  let i = 0;

  while (i < segments.length) {
    let found = false;

    for (let len = 1; len <= segments.length - i; len++) {
      const sliced = segments.slice(i, i + len);
      const candidate = sliced.join('-');

      if (await isDir(join(current, candidate))) {
        current = join(current, candidate);
        i += len;
        found = true;
        break;
      }

      if (len > 1) {
        const spaceCandidate = sliced.join(' ');
        if (await isDir(join(current, spaceCandidate))) {
          current = join(current, spaceCandidate);
          i += len;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      current = join(current, segments.slice(i).join('-'));
      break;
    }
  }

  return current;
}

const HOMEDIR = homedir();
const HOMEDIR_SLUG = HOMEDIR.replaceAll('/', '-').replace(/^-/, '');

export async function resolveWorkspaceSlug(slug: string): Promise<string> {
  const prefix = `${HOMEDIR_SLUG}-`;
  if (slug === HOMEDIR_SLUG) return HOMEDIR;
  if (!slug.startsWith(prefix)) return slug;

  const remainder = slug.slice(prefix.length);
  if (!remainder) return HOMEDIR;

  const segments = remainder.split('-');
  return resolveSegments(segments, HOMEDIR);
}

export async function extractProjectFromCursorSession(
  sessionPath: string,
): Promise<{ workspaceDir: string; displayName: string } | null> {
  const agentTranscriptsIdx = sessionPath.indexOf('/agent-transcripts/');
  if (agentTranscriptsIdx === -1) return null;

  const workspaceDir = sessionPath.slice(0, agentTranscriptsIdx);

  const trustedPath = join(workspaceDir, '.workspace-trusted');
  const trustedFile = Bun.file(trustedPath);

  if (await trustedFile.exists()) {
    try {
      const data = JSON.parse(await trustedFile.text());
      if (typeof data.workspacePath === 'string' && data.workspacePath.trim()) {
        return { workspaceDir, displayName: data.workspacePath.trim() };
      }
    } catch {}
  }

  const slug = basename(workspaceDir);
  const resolved = await resolveWorkspaceSlug(slug);
  return { workspaceDir, displayName: resolved };
}
