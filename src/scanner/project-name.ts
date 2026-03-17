import { basename, dirname, join } from 'node:path';

export async function extractCwdFromClaudeSession(
  filePath: string
): Promise<string | null> {
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
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function extractCwdFromCodexSession(
  filePath: string
): Promise<string | null> {
  try {
    const file = Bun.file(filePath);
    const headBlob = file.slice(0, 4096);
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
  sessionPath: string
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
