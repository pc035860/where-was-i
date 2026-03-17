import { createGeminiAdapter } from './gemini-adapter.ts';
import { createOpenAIAdapter } from './openai-adapter.ts';

export type ProviderName = 'gemini' | 'openai';

export interface LlmAdapter {
  generateIntent(prompt: string): Promise<string | undefined>;
}

export function createAdapter(provider: ProviderName = 'gemini', model?: string, debug = false): LlmAdapter {
  const geminiKey =
    process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'];
  const openaiKey = process.env['OPENAI_API_KEY'];

  if (provider === 'gemini') {
    if (!geminiKey) {
      throw new Error('Gemini provider requires GEMINI_API_KEY or GOOGLE_API_KEY environment variable');
    }
    if (debug) process.stderr.write(`[intent] adapter: gemini${model ? ` (${model})` : ''}\n`);
    return createGeminiAdapter(geminiKey, model);
  }

  if (!openaiKey) {
    throw new Error('OpenAI provider requires OPENAI_API_KEY environment variable');
  }
  if (debug) process.stderr.write(`[intent] adapter: openai${model ? ` (${model})` : ''}\n`);
  return createOpenAIAdapter(openaiKey, model);
}
