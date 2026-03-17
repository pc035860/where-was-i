import { GoogleGenAI } from '@google/genai';
import type { LlmAdapter } from './adapter.ts';

export function createGeminiAdapter(apiKey: string): LlmAdapter {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateIntent(prompt: string): Promise<string | undefined> {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
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
