import { describe, expect, test } from 'bun:test';
import { copyToClipboard } from '../../src/utils/clipboard.ts';

describe('copyToClipboard', () => {
  test('spawns pbcopy with correct stdin text', () => {
    let capturedCmd: string[] = [];
    let capturedStdin = '';
    const fakeStdin = {
      write(s: string) {
        capturedStdin = s;
      },
      end() {},
    };
    const origSpawn = Bun.spawn;
    try {
      Bun.spawn = ((cmd: string[]) => {
        capturedCmd = cmd;
        return { stdin: fakeStdin };
      }) as typeof Bun.spawn;

      const result = copyToClipboard('test-text');

      expect(result).toBe(true);
      expect(capturedCmd).toEqual(['pbcopy']);
      expect(capturedStdin).toBe('test-text');
    } finally {
      Bun.spawn = origSpawn;
    }
  });

  test('returns false when spawn fails', () => {
    const origSpawn = Bun.spawn;
    try {
      Bun.spawn = (() => {
        throw new Error('spawn failed');
      }) as typeof Bun.spawn;
      const result = copyToClipboard('test');
      expect(result).toBe(false);
    } finally {
      Bun.spawn = origSpawn;
    }
  });
});
