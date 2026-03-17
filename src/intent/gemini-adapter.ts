import { GoogleGenAI } from '@google/genai';
import type { LlmAdapter } from './adapter.ts';

const DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview';

export function createGeminiAdapter(apiKey: string, model?: string): LlmAdapter {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateIntent(prompt: string): Promise<string | undefined> {
      const response = await ai.models.generateContent({
        model: model || DEFAULT_MODEL,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 200,
        },
      });
      return response.text?.trim() || undefined;
    },
  };
}
