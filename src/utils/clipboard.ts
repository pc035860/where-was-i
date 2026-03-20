export function copyToClipboard(text: string): boolean {
  try {
    const proc = Bun.spawn(['pbcopy'], { stdin: 'pipe' });
    proc.stdin.write(text);
    proc.stdin.end();
    return true;
  } catch {
    return false;
  }
}
