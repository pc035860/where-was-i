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

  const log = (msg: string) => {
    if (debug) process.stderr.write(msg);
  };

  if (provider === 'openai' && openaiKey) {
    log('[intent] adapter: openai\n');
    return createOpenAIAdapter(openaiKey);
  }

  if (provider === 'gemini' && geminiKey) {
    log('[intent] adapter: gemini\n');
    return createGeminiAdapter(geminiKey);
  }

  if (geminiKey) {
    log('[intent] adapter: gemini\n');
    return createGeminiAdapter(geminiKey);
  }

  if (openaiKey) {
    log('[intent] adapter: openai\n');
    return createOpenAIAdapter(openaiKey);
  }

  return null;
}
