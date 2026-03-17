import type { ConversationContext } from '../scanner/types.ts';

export function buildIntentPrompt(context: ConversationContext): string {
  const userSection = context.userMessages.length > 0
    ? context.userMessages.map((m) => `- ${m}`).join('\n')
    : '- (none)';

  const assistantSection = context.assistantMessages.length > 0
    ? context.assistantMessages.map((m) => `- ${m}`).join('\n')
    : '- (none)';

  const toolSection = context.recentTools.length > 0
    ? context.recentTools.join(', ')
    : '(none)';

  return `Based on this coding session context, output TWO sentences in Traditional Chinese (繁體中文). First sentence: what is being worked on. Second sentence: current progress or next step. Max 60 characters total. Be specific and concrete.

Project: ${context.projectName}

Recent user messages:
${userSection}

Recent assistant responses:
${assistantSection}

Recent tools used: ${toolSection}

Intent:`;
}
