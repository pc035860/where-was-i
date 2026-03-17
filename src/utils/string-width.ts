function isFullWidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x303e) ||
    (code >= 0x3041 && code <= 0x33bf) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff01 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f000 && code <= 0x1fbff) ||
    (code >= 0x20000 && code <= 0x2fa1f)
  );
}

export function stringWidth(str: string): number {
  const stripped = Bun.stripANSI(str);
  let width = 0;
  for (const char of stripped) {
    width += isFullWidth(char.codePointAt(0)!) ? 2 : 1;
  }
  return width;
}

export function truncateToWidth(str: string, maxWidth: number): string {
  if (stringWidth(str) <= maxWidth) return str;
  let width = 0;
  let result = '';
  for (const char of str) {
    const w = isFullWidth(char.codePointAt(0)!) ? 2 : 1;
    if (width + w > maxWidth - 1) break;
    width += w;
    result += char;
  }
  return result + '…';
}
