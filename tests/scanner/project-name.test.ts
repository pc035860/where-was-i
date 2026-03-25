import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveSegments, resolveWorkspaceSlug } from '../../src/scanner/project-name.ts';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'wwi-slug-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('resolveSegments', () => {
  test('resolves simple path segments', async () => {
    await mkdir(join(tempDir, 'code', 'wwi'), { recursive: true });

    const result = await resolveSegments(['code', 'wwi'], tempDir);
    expect(result).toBe(join(tempDir, 'code', 'wwi'));
  });

  test('resolves dash in directory name', async () => {
    await mkdir(join(tempDir, 'git', 'ec-admin-frontend'), { recursive: true });

    const result = await resolveSegments(['git', 'ec', 'admin', 'frontend'], tempDir);
    expect(result).toBe(join(tempDir, 'git', 'ec-admin-frontend'));
  });

  test('resolves space in directory name', async () => {
    await mkdir(join(tempDir, 'My Folder', 'sub'), { recursive: true });

    const result = await resolveSegments(['My', 'Folder', 'sub'], tempDir);
    expect(result).toBe(join(tempDir, 'My Folder', 'sub'));
  });

  test('falls back to dash-joined remainder when resolution fails', async () => {
    await mkdir(join(tempDir, 'code'), { recursive: true });

    const result = await resolveSegments(['code', 'no', 'exist'], tempDir);
    expect(result).toBe(join(tempDir, 'code', 'no-exist'));
  });

  test('returns base for empty segments', async () => {
    const result = await resolveSegments([], tempDir);
    expect(result).toBe(tempDir);
  });

  test('resolves multi-level nested path with dashes', async () => {
    await mkdir(join(tempDir, 'git', 'samtsan', 'ec-admin-frontend'), { recursive: true });

    const result = await resolveSegments(['git', 'samtsan', 'ec', 'admin', 'frontend'], tempDir);
    expect(result).toBe(join(tempDir, 'git', 'samtsan', 'ec-admin-frontend'));
  });

  test('all segments unresolvable returns base + joined remainder', async () => {
    const result = await resolveSegments(['no', 'such', 'path'], tempDir);
    expect(result).toBe(join(tempDir, 'no-such-path'));
  });

  test('prefers dash-joined over space-joined when both exist', async () => {
    await mkdir(join(tempDir, 'a-b'), { recursive: true });
    await mkdir(join(tempDir, 'a b'), { recursive: true });

    const result = await resolveSegments(['a', 'b'], tempDir);
    expect(result).toBe(join(tempDir, 'a-b'));
  });
});

describe('resolveWorkspaceSlug', () => {
  test('returns raw slug when prefix does not match homedir', async () => {
    const result = await resolveWorkspaceSlug('completely-unknown-slug');
    expect(result).toBe('completely-unknown-slug');
  });

  test('does not match slug that shares homedir prefix but has extra chars', async () => {
    const { homedir } = await import('node:os');
    const home = homedir();
    const homeSlug = home.replaceAll('/', '-').replace(/^-/, '');
    const badSlug = `${homeSlug}2-project`;

    const result = await resolveWorkspaceSlug(badSlug);
    expect(result).toBe(badSlug);
  });

  test('returns homedir when slug equals homedir slug exactly', async () => {
    const { homedir } = await import('node:os');
    const home = homedir();
    const homeSlug = home.replaceAll('/', '-').replace(/^-/, '');

    const result = await resolveWorkspaceSlug(homeSlug);
    expect(result).toBe(home);
  });

  test('resolves real path for Claude encodedPath format (leading dash stripped)', async () => {
    const { homedir, platform } = await import('node:os');
    if (platform() !== 'darwin') return;

    const home = homedir();
    const homeSlug = home.replaceAll('/', '-').replace(/^-/, '');
    const slug = `${homeSlug}-code-wwi`;

    const result = await resolveWorkspaceSlug(slug);
    expect(result).toBe(`${home}/code/wwi`);
  });
});
