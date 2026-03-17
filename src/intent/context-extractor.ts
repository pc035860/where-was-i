import type { AgentSession, ConversationContext } from '../scanner/types.ts';

const MAX_USER_MESSAGES = 5;
const MAX_ASSISTANT_MESSAGES = 5;
const MAX_TOOLS = 5;
const MAX_MSG_LENGTH = 100;
const MAX_ASST_LENGTH = 150;
const TAIL_BYTES = 50 * 1024;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p: { type?: string }) => p.type === 'text')
      .map((p: { text?: string }) => p.text || '')
      .join(' ');
  }
  return '';
}

async function readTail(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const size = file.size;

  if (size <= TAIL_BYTES) {
    return file.text();
  }

  const tailBlob = file.slice(size - TAIL_BYTES, size);
  const text = await tailBlob.text();
  const firstNewline = text.indexOf('\n');
  return firstNewline >= 0 ? text.slice(firstNewline + 1) : text;
}

interface ParsedChunk {
  userMsg?: string;
  assistantMsg?: string;
  tools?: string[];
}

function finalizeContext(
  userMessages: string[],
  assistantMessages: string[],
  recentTools: string[],
  projectName: string
): ConversationContext {
  return {
    userMessages: userMessages.slice(-MAX_USER_MESSAGES),
    assistantMessages: assistantMessages.slice(-MAX_ASSISTANT_MESSAGES),
    recentTools: [...new Set(recentTools.slice(-MAX_TOOLS))],
    projectName,
  };
}

async function buildJsonlContext(
  session: AgentSession,
  parseLine: (data: Record<string, unknown>) => ParsedChunk
): Promise<ConversationContext> {
  const userMessages: string[] = [];
  const assistantMessages: string[] = [];
  const recentTools: string[] = [];

  const content = await readTail(session.sessionPath);
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      const chunk = parseLine(data);
      if (chunk.userMsg) userMessages.push(chunk.userMsg);
      if (chunk.assistantMsg) assistantMessages.push(chunk.assistantMsg);
      if (chunk.tools) recentTools.push(...chunk.tools);
    } catch {
      continue;
    }
  }

  return finalizeContext(userMessages, assistantMessages, recentTools, session.projectName);
}

function parseClaudeLine(data: Record<string, unknown>): ParsedChunk {
  const chunk: ParsedChunk = {};

  if (data.type === 'user') {
    const text = extractTextContent((data.message as { content?: unknown })?.content);
    if (text.trim()) chunk.userMsg = truncate(text.trim(), MAX_MSG_LENGTH);
  }

  if (data.type === 'assistant' && (data.message as { content?: unknown })?.content) {
    const parts = (data.message as { content: Array<{ type: string; text?: string; name?: string }> }).content;
    if (Array.isArray(parts)) {
      const tools: string[] = [];
      for (const part of parts) {
        if (part.type === 'text' && part.text?.trim()) {
          chunk.assistantMsg = truncate(part.text.trim(), MAX_ASST_LENGTH);
        }
        if (part.type === 'tool_use' && part.name) {
          tools.push(part.name);
        }
      }
      if (tools.length > 0) chunk.tools = tools;
    }
  }

  return chunk;
}

function parseCodexLine(data: Record<string, unknown>): ParsedChunk {
  const chunk: ParsedChunk = {};
  const payload = (data.payload || data) as Record<string, unknown>;

  if (payload.type === 'message' && payload.role === 'user') {
    const text = extractTextContent(payload.content);
    if (text.trim()) chunk.userMsg = truncate(text.trim(), MAX_MSG_LENGTH);
  }

  if (payload.type === 'message' && payload.role === 'assistant') {
    const text = extractTextContent(payload.content);
    if (text.trim()) chunk.assistantMsg = truncate(text.trim(), MAX_ASST_LENGTH);
  }

  if (payload.type === 'function_call' && payload.name) {
    chunk.tools = [payload.name as string];
  }

  return chunk;
}

async function extractGeminiContext(
  session: AgentSession
): Promise<ConversationContext> {
  const userMessages: string[] = [];
  const assistantMessages: string[] = [];
  const recentTools: string[] = [];

  try {
    const content = await Bun.file(session.sessionPath).text();
    const data = JSON.parse(content);
    const messages = data.messages || [];

    for (const msg of messages) {
      if (msg.type === 'user' && msg.content?.trim()) {
        userMessages.push(truncate(msg.content.trim(), MAX_MSG_LENGTH));
      }
      if (msg.type === 'gemini') {
        if (msg.content?.trim()) {
          assistantMessages.push(truncate(msg.content.trim(), MAX_ASST_LENGTH));
        }
        if (Array.isArray(msg.toolCalls)) {
          for (const tc of msg.toolCalls) {
            if (tc.name) recentTools.push(tc.name);
          }
        }
      }
    }
  } catch {
    // parse error
  }

  return finalizeContext(userMessages, assistantMessages, recentTools, session.projectName);
}

export async function extractContext(
  session: AgentSession
): Promise<ConversationContext> {
  switch (session.agentType) {
    case 'claude':
      return buildJsonlContext(session, parseClaudeLine);
    case 'codex':
      return buildJsonlContext(session, parseCodexLine);
    case 'gemini':
      return extractGeminiContext(session);
  }
}
