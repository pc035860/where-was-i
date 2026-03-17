import { describe, expect, test } from 'bun:test';
import { stringWidth, truncateToWidth, wrapToLines } from '../../src/utils/string-width.ts';

describe('stringWidth', () => {
  test('counts ASCII characters as width 1', () => {
    expect(stringWidth('hello')).toBe(5);
    expect(stringWidth('')).toBe(0);
    expect(stringWidth('abc123')).toBe(6);
  });

  test('counts CJK characters as width 2', () => {
    expect(stringWidth('你好')).toBe(4);
    expect(stringWidth('テスト')).toBe(6);
    expect(stringWidth('한글')).toBe(4);
  });

  test('handles mixed ASCII and CJK', () => {
    expect(stringWidth('hi你好')).toBe(6);
    expect(stringWidth('A中B')).toBe(4);
  });

  test('strips ANSI codes before measuring', () => {
    expect(stringWidth('\x1b[31mred\x1b[0m')).toBe(3);
    expect(stringWidth('\x1b[1m\x1b[32mbold green\x1b[0m')).toBe(10);
  });
});

describe('truncateToWidth', () => {
  test('returns original string if within maxWidth', () => {
    expect(truncateToWidth('hello', 10)).toBe('hello');
    expect(truncateToWidth('hi', 2)).toBe('hi');
  });

  test('truncates ASCII strings with ellipsis and correct content', () => {
    expect(truncateToWidth('hello world', 6)).toBe('hello…');
    expect(truncateToWidth('abcdefgh', 4)).toBe('abc…');
  });

  test('truncates CJK strings respecting character width', () => {
    expect(truncateToWidth('你好世界測試', 5)).toBe('你好…');
    expect(truncateToWidth('你好世界', 3)).toBe('你…');
  });

  test('handles maxWidth of 1', () => {
    expect(truncateToWidth('hello', 1)).toBe('…');
  });

  test('exact fit returns original', () => {
    expect(truncateToWidth('abc', 3)).toBe('abc');
    expect(truncateToWidth('你好', 4)).toBe('你好');
  });
});

describe('wrapToLines', () => {
  test('returns single line if text fits', () => {
    expect(wrapToLines('hello', 10)).toEqual(['hello']);
  });

  test('wraps long ASCII text preserving all content', () => {
    const lines = wrapToLines('abcdefghij', 5);
    expect(lines).toEqual(['abcde', 'fghij']);
  });

  test('wraps into three lines when needed', () => {
    const lines = wrapToLines('abcdefghijklmno', 5);
    expect(lines).toEqual(['abcde', 'fghij', 'klmno']);
  });

  test('applies indent to continuation lines', () => {
    const lines = wrapToLines('abcdefghijklmno', 8, 2);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]!.startsWith(' ')).toBe(false);
    expect(lines[1]!.startsWith('  ')).toBe(true);
    const joined = lines.map((l) => l.trimStart()).join('');
    expect(joined).toBe('abcdefghijklmno');
  });

  test('handles CJK text wrapping with correct splits', () => {
    const lines = wrapToLines('你好世界測試完成', 6);
    expect(lines).toEqual(['你好世', '界測試', '完成']);
  });

  test('returns empty array for empty string', () => {
    expect(wrapToLines('', 10)).toEqual([]);
  });
});
