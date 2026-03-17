import { GoogleGenAI } from '@google/genai';
import type { AgentSession, ConversationContext } from '../scanner/types.ts';
import { extractContext } from './context-extractor.ts';
import { buildIntentPrompt } from './prompt-template.ts';

const DEBOUNCE_MS = 3000;
const CACHE_TTL_MS = 30000;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 2;

interface CacheEntry {
  intent: string;
  hash: string;
  timestamp: number;
}

function hashContext(ctx: ConversationContext): string {
  const raw = [
    ...ctx.userMessages,
    ...ctx.assistantMessages,
    ...ctx.recentTools,
  ].join('|');
  return Bun.hash(raw).toString(36);
}

export class IntentEngine {
  private ai: GoogleGenAI | null = null;
  private cache = new Map<string, CacheEntry>();
  private rateLimits = new Map<string, number[]>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingCallbacks = new Map<string, () => void>();

  constructor() {
    const apiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'];
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  get isAvailable(): boolean {
    return this.ai !== null;
  }

  getIntent(sessionPath: string): string | undefined {
    const entry = this.cache.get(sessionPath);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(sessionPath);
      return undefined;
    }
    return entry.intent;
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
    const ctx = await extractContext(session);
    const hash = hashContext(ctx);

    const cached = this.cache.get(session.sessionPath);
    if (cached && cached.hash === hash) return cached.intent;

    if (!this.ai) {
      return ctx.userMessages.at(-1) ?? undefined;
    }

    if (!this.checkRateLimit(session.sessionPath)) {
      return cached?.intent ?? ctx.userMessages.at(-1) ?? undefined;
    }

    try {
      const prompt = buildIntentPrompt(ctx);
      const apiStart = Date.now();
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const apiMs = Date.now() - apiStart;
      process.stderr.write(`[intent] ${ctx.projectName}: ${apiMs}ms\n`);

      const intent = response.text?.trim();
      if (intent) {
        this.cache.set(session.sessionPath, {
          intent,
          hash,
          timestamp: Date.now(),
        });
        return intent;
      }
    } catch {
      // API error
    }

    return cached?.intent ?? ctx.userMessages.at(-1) ?? undefined;
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
