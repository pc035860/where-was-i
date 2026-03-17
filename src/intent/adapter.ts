import { createGeminiAdapter } from './gemini-adapter.ts';
import { createOpenAIAdapter } from './openai-adapter.ts';

export interface LlmAdapter {
  generateIntent(prompt: string): Promise<string | undefined>;
}

export function createAdapter(): LlmAdapter | null {
  const geminiKey =
    process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'];
  if (geminiKey) {
    process.stderr.write('[intent] adapter: gemini\n');
    return createGeminiAdapter(geminiKey);
  }

  const openaiKey = process.env['OPENAI_API_KEY'];
  if (openaiKey) {
    process.stderr.write('[intent] adapter: openai\n');
    return createOpenAIAdapter(openaiKey);
  }

  return null;
}
