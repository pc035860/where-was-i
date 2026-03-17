import OpenAI from 'openai';
import type { LlmAdapter } from './adapter.ts';

const DEFAULT_MODEL = 'gpt-4.1-mini';

export function createOpenAIAdapter(apiKey: string, model?: string): LlmAdapter {
  const client = new OpenAI({ apiKey });

  return {
    async generateIntent(prompt: string): Promise<string | undefined> {
      const response = await client.chat.completions.create({
        model: model || DEFAULT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.2,
      });
      return response.choices[0]?.message?.content?.trim() || undefined;
    },
  };
}
