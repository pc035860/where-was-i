import { createGeminiAdapter } from './gemini-adapter.ts';
import { createOpenAIAdapter } from './openai-adapter.ts';

export interface LlmAdapter {
  generateIntent(prompt: string): Promise<string | undefined>;
}

export function createAdapter(debug = false): LlmAdapter | null {
  const provider = process.env['WWI_PROVIDER']?.toLowerCase();
  const geminiKey =
    process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'];
  const openaiKey = process.env['OPENAI_API_KEY'];

  const adapters = {
    gemini: geminiKey ? () => createGeminiAdapter(geminiKey) : null,
    openai: openaiKey ? () => createOpenAIAdapter(openaiKey) : null,
  };

  const order = provider === 'openai'
    ? (['openai', 'gemini'] as const)
    : (['gemini', 'openai'] as const);

  for (const name of order) {
    const factory = adapters[name];
    if (factory) {
      if (debug) process.stderr.write(`[intent] adapter: ${name}\n`);
      return factory();
    }
  }

  return null;
}
