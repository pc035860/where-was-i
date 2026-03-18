const TAIL_SIZE = 32 * 1024;

async function extractTimestampFromJsonlTail(filePath: string): Promise<Date | null> {
  try {
    const file = Bun.file(filePath);
    const size = file.size;
    const start = Math.max(0, size - TAIL_SIZE);
    const blob = file.slice(start, size);
    const text = await blob.text();

    const lines = text.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]?.trim();
      if (!line) continue;
      try {
        const data = JSON.parse(line);
        if (typeof data.timestamp === 'string') {
          const date = new Date(data.timestamp);
          if (!Number.isNaN(date.getTime())) return date;
        }
      } catch {}
    }
    return null;
  } catch {
    return null;
  }
}

export const extractClaudeTimestamp = extractTimestampFromJsonlTail;
export const extractCodexTimestamp = extractTimestampFromJsonlTail;

export async function extractGeminiTimestamp(filePath: string): Promise<Date | null> {
  try {
    const text = await Bun.file(filePath).text();
    const data = JSON.parse(text);
    if (typeof data.lastUpdated === 'string') {
      const date = new Date(data.lastUpdated);
      if (!Number.isNaN(date.getTime())) return date;
    }
    return null;
  } catch {
    return null;
  }
}
