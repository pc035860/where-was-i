import type { ConversationContext } from '../scanner/types.ts';

function escapeXml(str: string): string {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrapMessages(messages: string[]): string {
  if (messages.length === 0) return '<msg>(none)</msg>';
  return messages.map((m) => `<msg>${escapeXml(m)}</msg>`).join('\n');
}

export function buildIntentPrompt(context: ConversationContext): string {
  const toolSection = context.recentTools.length > 0 ? escapeXml(context.recentTools.join(', ')) : '(none)';

  return `<system>You synthesize coding session activity into a brief status line.</system>

<context>
<project>${escapeXml(context.projectName)}</project>

<user_messages>
${wrapMessages(context.userMessages)}
</user_messages>

<assistant_messages>
${wrapMessages(context.assistantMessages)}
</assistant_messages>

<tools>${toolSection}</tools>
</context>

<instructions>
Output TWO sentences in Traditional Chinese (繁體中文), max 60 characters total.
1. User intent — what the user wants to achieve (NOT the project name)
2. Current action — what is happening right now

Do NOT restate the project name. Be specific and concrete.
</instructions>`;
}
