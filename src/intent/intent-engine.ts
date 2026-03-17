import type { AgentSession, ConversationContext } from '../scanner/types.ts';
import type { LlmAdapter } from './adapter.ts';
import { createAdapter } from './adapter.ts';
import { extractContext } from './context-extractor.ts';
import { buildIntentPrompt } from './prompt-template.ts';

const DEBOUNCE_MS = 3000;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 2;
const RETRY_COUNT = 1;
const RETRY_DELAY_MS = 500;
const CACHE_PATH = '/tmp/wwi-intent-cache.json';

interface CacheEntry {
  intent: string;
  hash: string;
}

function hashContext(ctx: ConversationContext): string {
  const raw = [
    ...ctx.userMessages,
    ...ctx.assistantMessages,
    ...ctx.recentTools,
  ].join('|');
  return Bun.hash(raw).toString(36);
}

async function loadDiskCache(): Promise<Map<string, CacheEntry>> {
  try {
    const file = Bun.file(CACHE_PATH);
    if (await file.exists()) {
      const data = await file.json();
      return new Map(Object.entries(data));
    }
  } catch {
    // corrupt or unreadable
  }
  return new Map();
}

async function saveDiskCache(cache: Map<string, CacheEntry>): Promise<void> {
  try {
    await Bun.write(CACHE_PATH, JSON.stringify(Object.fromEntries(cache)));
  } catch {
    // write error, non-critical
  }
}

export class IntentEngine {
  private adapter: LlmAdapter | null = null;
  private debug: boolean;
  private cache = new Map<string, CacheEntry>();
  private rateLimits = new Map<string, number[]>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingCallbacks = new Map<string, () => void>();
  private cacheLoaded = false;

  constructor(options?: { adapter?: LlmAdapter | null; debug?: boolean }) {
    this.debug = options?.debug ?? false;
    this.adapter = options?.adapter !== undefined ? options.adapter : createAdapter(this.debug);
  }

  get isAvailable(): boolean {
    return this.adapter !== null;
  }

  private async ensureCache(): Promise<void> {
    if (this.cacheLoaded) return;
    this.cache = await loadDiskCache();
    this.cacheLoaded = true;
  }

  private async persistCache(): Promise<void> {
    await saveDiskCache(this.cache);
  }

  getIntent(sessionPath: string): string | undefined {
    return this.cache.get(sessionPath)?.intent;
  }

  requestIntent(session: AgentSession, onUpdate?: () => void): void {
    const key = session.sessionPath;

    if (onUpdate) {
      this.pendingCallbacks.set(key, onUpdate);
    }

    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.doRequest(session);
    }, DEBOUNCE_MS);

    this.debounceTimers.set(key, timer);
  }

  async requestIntentSync(session: AgentSession): Promise<string | undefined> {
    await this.ensureCache();

    const ctx = await extractContext(session);
    const hash = hashContext(ctx);

    const cached = this.cache.get(session.sessionPath);
    if (cached && cached.hash === hash) return cached.intent;

    if (!this.adapter) {
      return ctx.userMessages.at(-1) ?? undefined;
    }

    if (!this.checkRateLimit(session.sessionPath)) {
      return cached?.intent ?? ctx.userMessages.at(-1) ?? undefined;
    }

    const prompt = buildIntentPrompt(ctx);
    const result = await this.callWithRetry(prompt, ctx.projectName);

    if (result) {
      const cleaned = result.replace(/\n/g, ' ').trim();
      this.cache.set(session.sessionPath, { intent: cleaned, hash });
      await this.persistCache();
      return cleaned;
    }

    return cached?.intent ?? ctx.userMessages.at(-1) ?? undefined;
  }

  private async callWithRetry(prompt: string, projectName: string): Promise<string | undefined> {
    for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
      try {
        const apiStart = Date.now();
        const intent = await this.adapter!.generateIntent(prompt);
        if (this.debug) {
          const ms = Date.now() - apiStart;
          const tag = attempt > 0 ? ` (retry ${attempt})` : '';
          process.stderr.write(`[intent] ${projectName}: ${ms}ms${tag}\n`);
        }
        if (intent) return intent;
      } catch {
        if (attempt < RETRY_COUNT) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    return undefined;
  }

  pruneStaleEntries(activePaths: Set<string>): void {
    for (const key of this.cache.keys()) {
      if (!activePaths.has(key)) this.cache.delete(key);
    }
    for (const key of this.rateLimits.keys()) {
      if (!activePaths.has(key)) this.rateLimits.delete(key);
    }
  }

  private async doRequest(session: AgentSession): Promise<void> {
    const intent = await this.requestIntentSync(session);
    if (intent) {
      const callback = this.pendingCallbacks.get(session.sessionPath);
      this.pendingCallbacks.delete(session.sessionPath);
      if (callback) callback();
    }
  }

  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const timestamps = this.rateLimits.get(key) || [];
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (recent.length >= RATE_LIMIT_MAX) return false;

    recent.push(now);
    this.rateLimits.set(key, recent);
    return true;
  }

  destroy(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingCallbacks.clear();
  }
}
