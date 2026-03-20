import chalk from 'chalk';
import type { ActivityLevel, AgentSession, AgentType } from '../scanner/types.ts';
import { AGENT_DISPLAY_NAMES, SESSION_ID_LENGTH } from '../scanner/types.ts';
import { stringWidth, truncateToWidth, wrapToLines } from '../utils/string-width.ts';
import { formatRelativeTime } from '../utils/time.ts';

const STATUS_ICONS: Record<ActivityLevel, string> = {
  active: chalk.green('●'),
  recent: chalk.yellow('●'),
  stale: chalk.gray('●'),
};

const AGENT_COLORS: Record<AgentType, (s: string) => string> = {
  claude: chalk.redBright,
  codex: chalk.cyanBright,
  gemini: chalk.magentaBright,
};

const AGENT_NAME_WIDTH = Math.max(...Object.values(AGENT_DISPLAY_NAMES).map((n) => n.length));

function padRight(str: string, len: number): string {
  const diff = len - stringWidth(str);
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

function renderAgentCard(session: AgentSession, innerWidth: number, index?: number): string[] {
  const icon = STATUS_ICONS[session.activityLevel];
  const agentName = AGENT_DISPLAY_NAMES[session.agentType];
  const colorFn = AGENT_COLORS[session.agentType];
  const time = formatRelativeTime(session.mtime);

  const indexWidth = 2;
  const timeStr = chalk.dim(time);
  const timeLen = stringWidth(timeStr);
  const paddedAgent = padRight(colorFn(agentName), AGENT_NAME_WIDTH);
  const prefixWidth = indexWidth + 2 + AGENT_NAME_WIDTH + 2;
  const PROJECT_PAD_WIDTH = 2;
  const SESSION_ID_WIDTH = 1 + SESSION_ID_LENGTH;
  const maxProjectWidth = innerWidth - prefixWidth - timeLen - 1 - PROJECT_PAD_WIDTH - SESSION_ID_WIDTH;

  let project = session.projectName;
  if (stringWidth(project) > maxProjectWidth) {
    project = maxProjectWidth > 2 ? truncateToWidth(project, maxProjectWidth) : project.slice(0, 3);
  }

  const indexStr = index != null ? `${chalk.dim(String(index))} ` : '  ';
  const styledProject = chalk.white.bgHex('#2a2a2a')(` ${project} `);
  const styledSessionId = chalk.dim(` ${session.sessionId}`);
  const label = `${indexStr}${icon} ${paddedAgent}  ${styledProject}${styledSessionId}`;
  const gap = innerWidth - stringWidth(label) - timeLen;
  const line1 = gap > 0 ? `${label}${' '.repeat(gap)}${timeStr}` : `${label} ${timeStr}`;

  const intentText = session.intent ? `→ ${session.intent}` : '→ …';
  const colorFn2 = session.intent ? chalk.white : chalk.dim;
  const intentLines = wrapToLines(intentText, innerWidth, 2).map((line) => padRight(colorFn2(line), innerWidth));

  return [line1, ...intentLines];
}

export interface RenderOptions {
  showStale: boolean;
  showAll?: boolean;
  statusMessage?: string;
}

export interface RenderResult {
  output: string;
  displayed: AgentSession[];
}

export function renderStatus(sessions: AgentSession[], options: RenderOptions): RenderResult {
  const termWidth = process.stdout.columns || 60;
  const termRows = process.stdout.rows || 24;
  const boxWidth = termWidth - 4;
  const innerWidth = boxWidth - 6;

  const buckets: Record<ActivityLevel, AgentSession[]> = { active: [], recent: [], stale: [] };
  for (const s of sessions) buckets[s.activityLevel].push(s);

  const b = chalk.hex('#888888');
  const topBorder = `  ${b('┌─')} ${chalk.bold('Where Was I')} ${b(`${'─'.repeat(Math.max(0, boxWidth - 16))}┐`)}`;
  const bottomBorder = `  ${b(`└${'─'.repeat(Math.max(0, boxWidth - 2))}┘`)}`;
  const emptyLine = `  ${b('│')}${' '.repeat(Math.max(0, boxWidth - 2))}${b('│')}`;

  const wrapLine = (content: string) => {
    return `  ${b('│')}  ${padRight(content, innerWidth)}  ${b('│')}`;
  };

  const visibleSessions = [...buckets.active, ...buckets.recent];

  if (visibleSessions.length === 0 && (!options.showStale || buckets.stale.length === 0)) {
    const output = [
      topBorder,
      emptyLine,
      wrapLine(chalk.dim('No active agent sessions')),
      emptyLine,
      bottomBorder,
    ].join('\n');
    return { output, displayed: [] };
  }

  const MAX_INDEXED = 9;

  const buildCards = (sessionList: AgentSession[], indexOffset: number) =>
    sessionList.map((session, idx) => {
      const num = idx + indexOffset;
      return {
        session,
        lines: renderAgentCard(session, innerWidth, num <= MAX_INDEXED ? num : undefined),
      };
    });

  const cards = buildCards(visibleSessions, 1);

  const hasStale = options.showStale && buckets.stale.length > 0;
  const overhead = 3;
  const overflowLineHeight = 2;
  const staleDividerHeight = hasStale ? 2 : 0;
  const statusMessageHeight = options.statusMessage ? 2 : 0;
  const availableRows = termRows - overhead - staleDividerHeight - statusMessageHeight;

  let mainCards = cards;
  let overflowCount = 0;

  if (!options.showAll) {
    let usedRows = 0;
    let fitCount = 0;

    for (const card of cards) {
      const cardHeight = 1 + card.lines.length;
      if (usedRows + cardHeight + overflowLineHeight > availableRows && fitCount < cards.length) {
        break;
      }
      usedRows += cardHeight;
      fitCount++;
    }

    if (fitCount < cards.length) {
      mainCards = cards.slice(0, fitCount);
      overflowCount = cards.length - fitCount;
    }
  }

  const displayed: AgentSession[] = mainCards.slice(0, MAX_INDEXED).map((c) => c.session);

  const lines: string[] = [];

  const pushCards = (cardList: { lines: string[] }[]) => {
    for (const card of cardList) {
      lines.push(emptyLine);
      for (const cardLine of card.lines) lines.push(wrapLine(cardLine));
    }
  };

  lines.push(topBorder);
  pushCards(mainCards);

  if (overflowCount > 0) {
    lines.push(emptyLine);
    lines.push(wrapLine(chalk.dim(`+${overflowCount} more sessions (a to expand)`)));
  }

  if (hasStale) {
    lines.push(emptyLine);
    const dividerText = '── stale ';
    const divider = dividerText + '─'.repeat(Math.max(0, innerWidth - dividerText.length));
    lines.push(wrapLine(chalk.dim(divider)));

    const staleOffset = visibleSessions.length + 1;
    const staleCards = buildCards(buckets.stale, staleOffset);
    const copyableStale = Math.max(0, MAX_INDEXED - displayed.length);
    for (const c of staleCards.slice(0, copyableStale)) displayed.push(c.session);
    pushCards(staleCards);
  }

  if (options.statusMessage) {
    const raw = `✓ ${options.statusMessage}`;
    const msg = stringWidth(raw) > innerWidth ? truncateToWidth(raw, innerWidth - 1) + '…' : raw;
    lines.push(emptyLine);
    lines.push(wrapLine(chalk.green(msg)));
  }

  lines.push(emptyLine);
  lines.push(bottomBorder);

  return { output: lines.join('\n'), displayed };
}
